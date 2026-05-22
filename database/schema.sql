-- =============================================================
--  Prendé el Fueguito — Schema PostgreSQL
--  Cubre: panel_usuario (Perfil, Pedidos, Direcciones,
--         Notificaciones, Seguridad) + panel_admin (Productos)
-- =============================================================

-- Extensión para UUIDs (opcional, se puede usar SERIAL en su lugar)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
--  USUARIOS
--  Datos del perfil y credenciales
-- =============================================================
CREATE TABLE usuarios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(120) NOT NULL,
    email           VARCHAR(254) NOT NULL UNIQUE,
    telefono        VARCHAR(30),
    fecha_nacimiento DATE,
    documento       VARCHAR(20),                    -- DNI / CUIL
    password_hash   TEXT        NOT NULL,           -- bcrypt hash, nunca texto plano
    rol             VARCHAR(20)  NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice útil para login por email
CREATE INDEX idx_usuarios_email ON usuarios (email);


-- =============================================================
--  SESIONES
--  Sesiones activas del usuario (sección Seguridad)
-- =============================================================
CREATE TABLE sesiones (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token           TEXT        NOT NULL UNIQUE,    -- token de sesión (JWT o aleatorio)
    dispositivo     VARCHAR(200),                   -- ej: "Chrome — Windows 10"
    ubicacion       VARCHAR(200),                   -- ej: "Buenos Aires, Argentina"
    ip              INET,
    ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_en       TIMESTAMPTZ                     -- NULL = sin vencimiento fijo
);

CREATE INDEX idx_sesiones_usuario ON sesiones (usuario_id);
CREATE INDEX idx_sesiones_token   ON sesiones (token);


-- =============================================================
--  PREFERENCIAS DE NOTIFICACIONES
--  Una fila por usuario (sección Notificaciones)
-- =============================================================
CREATE TABLE preferencias_notificaciones (
    usuario_id          UUID    PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    email_promociones   BOOLEAN NOT NULL DEFAULT TRUE,
    email_novedades     BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_pedidos    BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================
--  DIRECCIONES
--  Domicilios guardados para envío (sección Direcciones)
-- =============================================================
CREATE TABLE direcciones (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    alias       VARCHAR(60) NOT NULL,               -- ej: "Casa", "Trabajo"
    icono       VARCHAR(40) NOT NULL DEFAULT 'house', -- fa-solid fa-* sin prefijo
    calle       VARCHAR(200) NOT NULL,
    ciudad      VARCHAR(100) NOT NULL,
    provincia   VARCHAR(100) NOT NULL DEFAULT 'Buenos Aires',
    pais        VARCHAR(60)  NOT NULL DEFAULT 'Argentina',
    codigo_postal VARCHAR(10),
    es_principal BOOLEAN    NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_direcciones_usuario ON direcciones (usuario_id);

-- Garantiza que solo una dirección sea principal por usuario
CREATE UNIQUE INDEX idx_direccion_principal
    ON direcciones (usuario_id)
    WHERE es_principal = TRUE;


-- =============================================================
--  CATEGORÍAS
--  Categorías del catálogo — admin las gestiona desde panel
-- =============================================================
CREATE TABLE categorias (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(80)  NOT NULL UNIQUE,
    icono       VARCHAR(60)  NOT NULL DEFAULT 'fire-flame-curved', -- fa-solid fa-* sin prefijo
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    orden       SMALLINT     NOT NULL DEFAULT 0,    -- para ordenar el menú/filtros
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- =============================================================
--  PRODUCTOS
--  Catálogo de productos de la tienda (gestionado desde panel_admin)
-- =============================================================
CREATE TYPE estado_producto  AS ENUM ('activo', 'inactivo', 'sin-stock');
CREATE TYPE fraccion_producto AS ENUM ('unidad', 'kg', 'gr');

CREATE TABLE productos (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(200)  NOT NULL,
    categoria_id    UUID          REFERENCES categorias(id) ON DELETE SET NULL,
    precio          NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
    stock           INT            NOT NULL DEFAULT 0 CHECK (stock >= 0),
    fraccion        fraccion_producto NOT NULL DEFAULT 'unidad',
    estado          estado_producto NOT NULL DEFAULT 'activo',
    descripcion     TEXT,
    imagen_url      TEXT,
    creado_por      UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productos_categoria ON productos (categoria_id);
CREATE INDEX idx_productos_estado    ON productos (estado);


-- =============================================================
--  PEDIDOS
--  Cabecera del pedido (sección Mis Pedidos)
-- =============================================================
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'en_proceso', 'enviado', 'entregado', 'cancelado');

CREATE TABLE pedidos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    numero          SERIAL      UNIQUE NOT NULL,    -- #00123 — formateado en app
    usuario_id      UUID        NOT NULL REFERENCES usuarios(id),
    direccion_id    UUID        REFERENCES direcciones(id) ON DELETE SET NULL,
    estado          estado_pedido NOT NULL DEFAULT 'pendiente',
    subtotal        NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    descuento       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    costo_envio     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
    total           NUMERIC(12, 2) GENERATED ALWAYS AS
                        (subtotal - descuento + costo_envio) STORED,
    notas           TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pedidos_usuario ON pedidos (usuario_id);
CREATE INDEX idx_pedidos_estado  ON pedidos (estado);


-- =============================================================
--  ITEMS DEL PEDIDO
--  Detalle de productos en cada pedido
-- =============================================================
CREATE TABLE pedido_items (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id       UUID        NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     UUID        REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(200) NOT NULL,          -- copia al momento de compra
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    cantidad        INT         NOT NULL CHECK (cantidad > 0),
    subtotal        NUMERIC(12, 2) GENERATED ALWAYS AS
                        (precio_unitario * cantidad) STORED
);

CREATE INDEX idx_items_pedido ON pedido_items (pedido_id);


-- =============================================================
--  TRIGGER: actualizar updated_at automáticamente
-- =============================================================
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_actualizado
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_pedidos_actualizado
    BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_notif_actualizado
    BEFORE UPDATE ON preferencias_notificaciones
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_productos_actualizado
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- =============================================================
--  DATOS DE EJEMPLO (desarrollo)
-- =============================================================

-- Usuario cliente
INSERT INTO usuarios (nombre, email, telefono, fecha_nacimiento, documento, password_hash, rol)
VALUES (
    'Juan García',
    'juan.garcia@email.com',
    '+54 11 1234-5678',
    '1990-05-15',
    '35123456',
    '$2b$12$examplehashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'cliente'
);

-- Usuario administrador
INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES (
    'Admin',
    'admin@fueguito.com',
    '$2b$12$examplehashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'admin'
);

-- Preferencias de notificaciones para Juan
INSERT INTO preferencias_notificaciones (usuario_id, email_promociones, email_novedades, whatsapp_pedidos)
SELECT id, TRUE, TRUE, TRUE FROM usuarios WHERE email = 'juan.garcia@email.com';

-- Direcciones de Juan
INSERT INTO direcciones (usuario_id, alias, icono, calle, ciudad, provincia, pais, es_principal)
SELECT id, 'Casa', 'house', 'Av. Siempre Viva 123', 'CABA', 'Buenos Aires', 'Argentina', TRUE
FROM usuarios WHERE email = 'juan.garcia@email.com';

INSERT INTO direcciones (usuario_id, alias, icono, calle, ciudad, provincia, pais, es_principal)
SELECT id, 'Trabajo', 'briefcase', 'Av. Libertador 456', 'CABA', 'Buenos Aires', 'Argentina', FALSE
FROM usuarios WHERE email = 'juan.garcia@email.com';

-- Categorías (coinciden con las opciones del panel_admin)
INSERT INTO categorias (nombre, icono, orden) VALUES
    ('Asados',   'fire-flame-curved', 1),
    ('Especias', 'pepper-hot',        2),
    ('Salsas',   'bottle-droplet',    3),
    ('Ahumados', 'smog',              4);

-- Productos de ejemplo (los mismos del panel_admin hardcodeados)
INSERT INTO productos (nombre, categoria_id, precio, stock, estado, descripcion, creado_por)
SELECT 'Chimichurri Clásico 250g', c.id, 2800, 48, 'activo', NULL,
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Salsas';

INSERT INTO productos (nombre, categoria_id, precio, stock, estado, creado_por)
SELECT 'Rub de Asado Patagónico', c.id, 1950, 30, 'activo',
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Especias';

INSERT INTO productos (nombre, categoria_id, precio, stock, estado, creado_por)
SELECT 'Sal Parrillera Gruesa 1kg', c.id, 1200, 0, 'sin-stock',
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Asados';

INSERT INTO productos (nombre, categoria_id, precio, stock, estado, creado_por)
SELECT 'Pimentón Ahumado 100g', c.id, 1650, 15, 'activo',
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Ahumados';

INSERT INTO productos (nombre, categoria_id, precio, stock, estado, creado_por)
SELECT 'Salsa Criolla Picante 350g', c.id, 3100, 22, 'activo',
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Salsas';

INSERT INTO productos (nombre, categoria_id, precio, stock, estado, creado_por)
SELECT 'Mix 7 Especias BBQ', c.id, 2200, 9, 'activo',
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Especias';

INSERT INTO productos (nombre, categoria_id, precio, stock, estado, creado_por)
SELECT 'Leña de Quebracho 5kg', c.id, 4500, 5, 'activo',
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Asados';

INSERT INTO productos (nombre, categoria_id, precio, stock, estado, creado_por)
SELECT 'Ajo Deshidratado Ahumado 80g', c.id, 1400, 0, 'inactivo',
       (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
FROM categorias c WHERE c.nombre = 'Ahumados';
