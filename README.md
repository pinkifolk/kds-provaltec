# 🍽️ Provaltec KDS

> **Kitchen Display System** para televisores **LG webOS** — tablero visual que muestra en tiempo real el estado de los pedidos de **retiro**, integrado con el WMS **Impruvex**.

<p align="center">
  <img src="img/LOGO-PROVALTEC.png" alt="Provaltec" width="260">
</p>

---

## 📋 ¿Qué hace?

Muestra en pantalla dos columnas — **En proceso** y **Listo para retiro** — y va moviendo cada pedido según su avance, con un código de colores y una **alerta sonora** cuando un pedido queda listo.

| Estado (Impruvex) | Columna | Color |
|---|---|---|
| `ASIGNADA` | En proceso | ⬜ Gris |
| `EN PICKING` | En proceso | 🟧 Ámbar |
| `PICKEADA` | Listo para retiro | 🟩 Verde + 🔔 sonido |
| `DESPACHADO` / `CANCELADA` / otros | — | Se elimina del tablero |

### 🔎 Filtros
El tablero **solo muestra pedidos de retiro**. Una OS aparece únicamente si cumple:

- **`tipoOs`** = `OSEXPRESS` o `OV`
- **`campo02`** = `RETIRO`

> Los pedidos de despacho u otros tipos **no se muestran**.

### 🎨 Colores de marca
- Verde corporativo principal: **`#73A114`**
- Ámbar (picking): `#b45309` · Verde listo: `#15803d` · Gris proceso: `#6b7280`

---

## 🏗️ Arquitectura

```
Impruvex  ──(webhook)──►  webhook.php  ──►  pedidos.json
  (WMS)                                          │
                                                 ▼
  App TV  ──(consulta cada 5s)──►  estados.php  ──►  devuelve la lista
```

- **`php/webhook.php`** — recibe la notificación de Impruvex, filtra y guarda el estado.
- **`php/estado.php`** — entrega la lista actual de pedidos (lo que consulta la TV).
- **App webOS** — consulta `estados.php` cada 5 s y actualiza la pantalla.

---

## 📂 Estructura del proyecto

```
app-provaltec/
├── appinfo.json          # Metadatos de la app webOS (id, ícono, memoria…)
├── index.html            # Pantalla principal
├── css/
│   └── styles.css        # Estilos (CSS propio, sin dependencias externas)
├── js/
│   └── server.js         # Lógica: polling, estados, sonido, botón salir
├── img/                  # Logo, íconos, fondo
├── sonido/
│   └── notificacion.mp3  # Alerta al quedar listo un pedido
└── php/                  # Backend (se sube al servidor, NO al TV)
    ├── webhook.php
    └── estado.php
```

---

## ⚙️ Configuración previa

1. **URL del backend** — en [`js/server.js`](js/server.js), línea 3:
   ```js
   var API_URL = 'https://TU_DOMINIO/kds/estados.php';
   ```
2. **Backend** — sube `php/webhook.php` y `php/estado.php` a tu hosting. Configura en Impruvex el webhook apuntando a `https://TU_DOMINIO/kds/webhook.php`.
3. **Seguridad** — en `webhook.php`, la variable `$IPS_PERMITIDAS` acepta solo la IP de Impruvex.
4. **Modo debug** — en `server.js`, `var DEBUG = true;` muestra un cartel de estado en pantalla. Ponlo en `false` para producción.

---

## 📺 Compilar e instalar en el televisor

### Requisitos
- **Node.js** instalado.
- **webOS TV CLI** de LG:
  ```bash
  npm install -g @webos-tools/cli
  ```
  > Verifica con `ares --version`.
- **Developer Mode** activado en la TV: instala la app **"Developer Mode"** desde el Content Store, crea una cuenta en [webostv.developer.lge.com](https://webostv.developer.lge.com), inicia sesión en la TV y activa *Dev Mode ON*.

### Paso 1 — Registrar el televisor
En la app "Developer Mode" de la TV verás su **IP** y el **passphrase**.

```bash
ares-setup-device
```
Agrega un dispositivo nuevo con la IP de la TV, puerto `9922`, usuario `prisoner`.

> También puedes usar `ares-novacom --device <nombre> --getkey` para obtener la clave con el passphrase.

### Paso 2 — Empaquetar la app (generar el `.ipk`)
Desde la raíz del proyecto:

```bash
ares-package .
```
Esto crea el instalable **`com.provaltec.kds_1.0.0_all.ipk`**.

> 💡 El backend (`php/`) **no** debe ir dentro del paquete. Empaqueta solo la app web.

### Paso 3 — Instalar en el televisor
```bash
ares-install --device <nombre-tv> com.provaltec.kds_1.0.0_all.ipk
```

### Paso 4 — Lanzar la app
```bash
ares-launch --device <nombre-tv> com.provaltec.kds
```

### Desinstalar
```bash
ares-install --device <nombre-tv> --remove com.provaltec.kds
```

---

## 🔁 Comandos rápidos

```bash
ares-package .                                             # 1. empaquetar
ares-install --device provaltec-tv com.provaltec.kds_1.0.0_all.ipk   # 2. instalar
ares-launch  --device provaltec-tv com.provaltec.kds      # 3. lanzar
```

---

## ⚠️ Nota sobre permanencia

Las apps instaladas por **Developer Mode son temporales**: la sesión caduca (~50 h) y la TV borra la app. Para renovar, abre la app "Developer Mode" en la TV y presiona **"Extend session"**.

Para uso permanente 24/7 en producción, las opciones son:
- Publicar la app en el **LG Content Store**, o
- Usar una pantalla **LG webOS Signage** (hardware comercial), que permite instalar apps locales permanentes.

---

## 🕹️ Uso en la TV

- **Al abrir:** aparece el botón **"Activar sonido"** — presiona **OK** en el control (necesario una vez por la política de audio de webOS).
- **Botón BACK:** pide confirmación antes de salir (navega con ◄ ► y confirma con **OK**).
- **Botón HOME:** la app pasa a segundo plano y **pausa** el consumo de datos y el sonido; al volver, se reanuda sola.

---

<p align="center"><sub>Provaltec KDS · Integración con Impruvex · webOS</sub></p>
