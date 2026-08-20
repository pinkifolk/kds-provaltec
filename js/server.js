console.log("Server script loaded successfully.");

var API_URL = ''; // <-- tu URL real
var INTERVALO_MS = 5000;  
var DEBUG = true;       

var sonidoListo = new Audio('./sonido/notificacion.mp3');
sonidoListo.preload = 'auto';

function reproducirSonido() {
    if (typeof appEstaVisible === 'function' && !appEstaVisible()) return;
    try {
        sonidoListo.currentTime = 0;
        var p = sonidoListo.play();
        if (p && p.catch) {
            p.catch(function (error) {
                console.error("El navegador bloqueo el audio:", error);
            });
        }
    } catch (e) {
        console.error("Error reproduciendo sonido:", e);
    }
}
var debugBox = null;

function mostrarDebug(texto) {
    if (!DEBUG) return;
    if (!debugBox) {
        debugBox = document.createElement('div');
        debugBox.id = 'debug-box';
        document.body.appendChild(debugBox);
    }
    debugBox.innerHTML = texto;
}

function mostrarOverlayActivacion() {
    var overlay = document.createElement('div');
    overlay.id = 'overlay-activar';

    var texto = document.createElement('p');
    texto.id = 'overlay-texto';
    texto.innerHTML = '🔊 El sonido de notificacion esta desactivado';

    var boton = document.createElement('button');
    boton.id = 'boton-activar';
    boton.innerHTML = 'Activar sonido';

    boton.onclick = function () {
        try {
            var p = sonidoListo.play();
            if (p && p.then) {
                p.then(function () {
                    sonidoListo.pause();
                    sonidoListo.currentTime = 0;
                    console.log("Audio desbloqueado.");
                });
            }
        } catch (e) {}
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    overlay.appendChild(texto);
    overlay.appendChild(boton);
    document.body.appendChild(overlay);

    boton.focus(); 
}

var pedidosEnPantalla = {};

function columnaDeEstado(estado) {
    if (estado === 'PICKEADA') return 'col-listo';
    return 'col-preparacion'; 
}

function claseColor(estado) {
    if (estado === 'PICKEADA') return 'bg-green-700';
    if (estado === 'EN PICKING') return 'bg-picking';
    return 'bg-gray-500';
}

function aplicarColor(span, estado) {
    span.className = 'font-bold text-white p-4 rounded-lg ' + claseColor(estado);
}

function crearSpan(codigo, estado) {
    var span = document.createElement('span');
    span.setAttribute('data-codigo', codigo);
    span.innerHTML = codigo;
    aplicarColor(span, estado);
    return span;
}

function actualizarPantalla(pedidos) {
    var recibidos = {};
    var i;

    for (i = 0; i < pedidos.length; i++) {
        var codigo = pedidos[i].codigo;
        var estado = String(pedidos[i].estado || '').toUpperCase().replace(/^\s+|\s+$/g, '');

        if (estado !== 'ASIGNADA' && estado !== 'EN PICKING' && estado !== 'PICKEADA') {
            continue;
        }

        recibidos[codigo] = true;

        var existente = pedidosEnPantalla[codigo];

        if (!existente) {
            var span = crearSpan(codigo, estado);
            document.getElementById(columnaDeEstado(estado)).appendChild(span);
            pedidosEnPantalla[codigo] = { estado: estado, element: span };
            if (estado === 'PICKEADA') reproducirSonido();

        } else if (existente.estado !== estado) {
            aplicarColor(existente.element, estado);
            var destino = columnaDeEstado(estado);
            if (existente.element.parentNode.id !== destino) {
                document.getElementById(destino).appendChild(existente.element);
            }
            if (estado === 'PICKEADA' && existente.estado !== 'PICKEADA') {
                reproducirSonido();
            }
            existente.estado = estado;
        }
    }

    // Eliminar los que ya no vienen (ej. DESPACHADA)
    for (var cod in pedidosEnPantalla) {
        if (pedidosEnPantalla.hasOwnProperty(cod) && !recibidos[cod]) {
            var el = pedidosEnPantalla[cod].element;
            if (el.parentNode) el.parentNode.removeChild(el);
            delete pedidosEnPantalla[cod];
        }
    }
}

var pollingCorriendo = false;

function appEstaVisible() {
    if (typeof document.hidden !== 'undefined') return !document.hidden;
    if (typeof document.webkitHidden !== 'undefined') return !document.webkitHidden;
    return true;
}

function programarSiguiente() {
    if (appEstaVisible()) {
        setTimeout(consultar, INTERVALO_MS);
    } else {
        pollingCorriendo = false;
        mostrarDebug('En pausa (app en segundo plano)');
    }
}

function consultar() {
    if (!appEstaVisible()) {
        pollingCorriendo = false;
        return;
    }
    pollingCorriendo = true;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '?t=' + new Date().getTime(), true); // ?t evita cache
    xhr.timeout = INTERVALO_MS + 5000;

    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;

        if (xhr.status === 200) {
            try {
                var pedidos = JSON.parse(xhr.responseText);
                actualizarPantalla(pedidos);
                var hora = new Date().toLocaleTimeString();
                mostrarDebug('OK ' + hora + ' &middot; ' + pedidos.length + ' pedidos');
            } catch (e) {
                mostrarDebug('ERROR JSON: ' + xhr.responseText.substring(0, 120));
            }
        } else {
            mostrarDebug('ERROR HTTP ' + xhr.status + ' al llamar la API');
        }

        programarSiguiente();
    };

    xhr.onerror = function () {
        mostrarDebug('ERROR de RED: la TV no alcanza ' + API_URL);
        programarSiguiente();
    };

    xhr.ontimeout = function () {
        mostrarDebug('TIMEOUT: el servidor no respondio a tiempo');
        programarSiguiente();
    };

    xhr.send();
}
function alCambiarVisibilidad() {
    if (appEstaVisible() && !pollingCorriendo) {
        mostrarDebug('Reanudando...');
        consultar();
    }
}
document.addEventListener('visibilitychange', alCambiarVisibilidad, false);
document.addEventListener('webkitvisibilitychange', alCambiarVisibilidad, false);
document.addEventListener('webOSRelaunch', alCambiarVisibilidad, false);
window.addEventListener('focus', alCambiarVisibilidad, false);

var overlaySalir = null;
var botonesSalir = [];  

function cerrarApp() {
    try {
        window.close();
    } catch (err) {
        if (window.webOSSystem && window.webOSSystem.platformBack) {
            window.webOSSystem.platformBack();
        }
    }
}

function ocultarConfirmacionSalir() {
    if (overlaySalir && overlaySalir.parentNode) {
        overlaySalir.parentNode.removeChild(overlaySalir);
    }
    overlaySalir = null;
    botonesSalir = [];
}

function moverFocoSalir(direccion) {
    if (botonesSalir.length === 0) return;
    var actual = 0;
    for (var i = 0; i < botonesSalir.length; i++) {
        if (botonesSalir[i] === document.activeElement) actual = i;
    }
    var siguiente = actual + direccion;
    if (siguiente < 0) siguiente = botonesSalir.length - 1;
    if (siguiente >= botonesSalir.length) siguiente = 0;
    botonesSalir[siguiente].focus();
}

function mostrarConfirmacionSalir() {
    if (overlaySalir) return;

    overlaySalir = document.createElement('div');
    overlaySalir.id = 'overlay-salir';

    var texto = document.createElement('p');
    texto.id = 'salir-texto';
    texto.innerHTML = '¿Salir de la aplicacion?';

    var fila = document.createElement('div');
    fila.id = 'salir-botones';

    var btnCancelar = document.createElement('button');
    btnCancelar.className = 'btn-salir';
    btnCancelar.innerHTML = 'Cancelar';
    btnCancelar.onclick = ocultarConfirmacionSalir;

    var btnSalir = document.createElement('button');
    btnSalir.className = 'btn-salir btn-salir-rojo';
    btnSalir.innerHTML = 'Salir';
    btnSalir.onclick = cerrarApp;

    fila.appendChild(btnCancelar);
    fila.appendChild(btnSalir);
    overlaySalir.appendChild(texto);
    overlaySalir.appendChild(fila);
    document.body.appendChild(overlaySalir);

    botonesSalir = [btnCancelar, btnSalir];
    btnCancelar.focus(); 
}
function ponerGuardiaHistorial() {
    try {
        history.pushState(null, '', location.href);
    } catch (e) {}
}

function iniciarControlBack() {
    ponerGuardiaHistorial();

    window.addEventListener('popstate', function () {
        if (overlaySalir) {
            ocultarConfirmacionSalir();
        } else {
            mostrarConfirmacionSalir();
        }
        ponerGuardiaHistorial();
    }, false);
}

document.addEventListener('keydown', function (e) {
    if (e.keyCode === 461) {
        if (overlaySalir) {
            ocultarConfirmacionSalir();
        } else {
            mostrarConfirmacionSalir();
        }
        if (e.preventDefault) e.preventDefault();
        return;
    }

    if (overlaySalir) {
        if (e.keyCode === 37) {           
            moverFocoSalir(-1);
            if (e.preventDefault) e.preventDefault();
        } else if (e.keyCode === 39) {    
            moverFocoSalir(1);
            if (e.preventDefault) e.preventDefault();
        } else if (e.keyCode === 13) {   
            if (document.activeElement && document.activeElement.click) {
                document.activeElement.click();
            }
            if (e.preventDefault) e.preventDefault();
        }
    }
}, false);

document.addEventListener('DOMContentLoaded', function () {
    mostrarOverlayActivacion();
    iniciarControlBack();
    mostrarDebug('Iniciando...');
    consultar();
});
