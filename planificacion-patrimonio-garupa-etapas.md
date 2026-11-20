# Planificación en Dos Etapas — Sistema de Gestión Patrimonial

## Municipalidad de Garupá

> Documento complementario de `planificacion-patrimonio-garupa.md`.
> El plan original se conserva como referencia normativa y funcional. Este documento prioriza el desarrollo real en dos etapas.

---

## 1. Decisiones acordadas

| Tema | Decisión |
|---|---|
| **Etapa 1** | Sistema operativo para que el Encargado de Patrimonio pueda cargar y administrar los bienes y los consumibles. |
| **Etapa 2** | Gestión contable, libros obligatorios del HTC, cierres, rúbrica digital y conciliación. |
| **Importación masiva** | No se implementa en Etapa 1. La carga inicial será manual. |
| **Roles** | Dos roles: **Patrimonio** (operativo) y **Contable** (administrador total). |
| **Contable** | Es el usuario administrador: hace todo y ve todo. |
| **Patrimonio** | No accede a la parte contable: sin libros, cierres, rúbrica, conciliación ni reportes oficiales. |
| **Bienes de Etapa 1** | Bienes registrables/inventariables (mobiliario, equipos, rodados, maquinaria, inmuebles) y consumibles. |
| **Compras en Etapa 1** | Registro simple de compras/ingresos para dar entrada a bienes y consumibles. Sin expedientes ni órdenes de pago formales. |

---

## 2. Objetivo de cada etapa

### Etapa 1 — Sistema operativo de Patrimonio

Que el Encargado de Patrimonio pueda dejar de trabajar con planillas sueltas y administrar desde un único sistema:

- Todos los bienes registrables de la municipalidad.
- Todos los consumibles y su stock.
- Ubicaciones, responsables y subresponsables.
- Ingresos por compra o entrega.
- Etiquetas con código QR.
- Búsquedas y reportes operativos básicos.

### Etapa 2 — Gestión contable y HTC

Agregar sobre la misma base:

- Libros y planillas obligatorias del HTC.
- Cierres por ejercicio y congelamiento de libros.
- Rúbrica digital y presentaciones.
- Conciliación con Contaduría.
- Compras formales, expedientes y órdenes de pago.
- Verificaciones físicas y siniestros.
- Importación masiva de datos históricos.

---

## 3. Roles y permisos

### 3.1 Rol Patrimonio

Puede operar el día a día:

- Alta, edición y baja lógica de bienes.
- Alta, edición y baja de consumibles.
- Registro de ingresos, compras simples y entregas.
- Movimientos de ubicación y custodia.
- Impresión de etiquetas QR.
- Consulta de stock, bienes por área y bienes por responsable.
- Uso de catálogos operativos.

No puede:

- Gestionar usuarios.
- Ver o generar libros del HTC.
- Ver cierres, rúbrica digital o conciliación contable.
- Acceder a configuraciones generales del sistema.

### 3.2 Rol Contable (administrador)

Puede todo:

- Todo lo que hace Patrimonio.
- Gestión de usuarios y roles.
- Configuración de catálogos y parámetros.
- Acceso a valores, reportes y datos completos.
- En Etapa 2: libros, cierres, rúbrica, conciliación y presentaciones.

### 3.3 Matriz resumida

| Funcionalidad | Patrimonio | Contable |
|---|---|---|
| Bienes registrables | Sí | Sí |
| Consumibles y stock | Sí | Sí |
| Ingresos y compras simples | Sí | Sí |
| Ubicaciones y custodia | Sí | Sí |
| Etiquetas QR | Sí | Sí |
| Usuarios y configuración | No | Sí |
| Libros HTC | No | Sí (Etapa 2) |
| Cierres y rúbrica | No | Sí (Etapa 2) |
| Conciliación contable | No | Sí (Etapa 2) |
| Auditoría completa | No | Sí |

> El valor histórico del bien forma parte de la ficha del bien. Si se decide que Patrimonio no lo vea, se restringe a nivel de campo sin cambiar el modelo de datos.

---

## 4. Etapa 1 — Alcance funcional

### 4.1 Módulo de autenticación y usuarios

- Login con usuario y contraseña.
- Dos roles: `PATRIMONIO` y `CONTABLE`.
- El rol `CONTABLE` es administrador.
- Alta, edición, baja y reseteo de usuarios solo por Contable.
- Control de acceso en backend, no solo en el menú.
- Registro de auditoría de accesos y cambios.

### 4.2 Catálogos operativos

- **Rubros:** nombre, familia del bien, código interno y código de cuenta contable opcional para Etapa 2.
- **Estados del bien:** en uso, en desuso, en reparación, en depósito, prestado, dado de baja.
- **Áreas/dependencias:** nombre, dirección, responsable.
- **Personas:** nombre, apellido, DNI, cargo, área.
- **Tipos de incorporación:** compra, donación, transferencia, préstamo, etc.

### 4.3 Bienes registrables

Campos mínimos:

- Organismo (Departamento Ejecutivo o Honorable Concejo Deliberante).
- Código de inventario único y no reutilizable, visible en el bien.
- Descripción.
- Marca, modelo y número de serie (según familia del rubro).
- Número de motor y patente para vehículos y máquinas viales.
- Material, medidas y color.
- Rubro.
- Estado.
- Área/dependencia.
- Responsable/subresponsable.
- Tipo de incorporación.
- Fecha de alta o incorporación.
- Valor histórico de incorporación.
- Observaciones.
- Activo/inactivo.

Funcionalidades:

- Alta, edición y baja lógica.
- Generación automática del código único por organismo y rubro, con vista previa antes de guardar.
- Carga manual explícita de códigos para bienes históricos, sin reutilizar códigos existentes.
- Código inmutable después del alta; cualquier corrección administrativa futura debe quedar auditada.
- Generación e impresión de etiqueta QR.
- Historial de custodias.
- Historial de ubicaciones.
- Búsqueda por código, descripción, rubro, área, estado y responsable.
- Ficha completa del bien.

Cada rubro tiene una familia (inmueble, mueble, maquinaria, vehículo, máquina vial, biblioteca u otro) que define qué campos se muestran. Marca, modelo y número de serie son obligatorios en máquinas, vehículos y máquinas viales; la patente se exige en vehículos y máquinas viales. No se exigen en muebles, inmuebles ni bibliotecas.

Los inmuebles incorporan situación (ocupado, desocupado, alquilado, cedido/comodato, en litigio), tipo, domicilio, localidad/provincia/código postal, partida y nomenclatura catastral, matrícula, superficies, destino y datos de escritura. Por ahora estos campos son opcionales. Para inmuebles se usan los estados En uso, En desuso, En reparación y Dado de baja; En depósito y Prestado quedan ocultos.

Formato de código implementado: `1-<código de categoría>-<correlativo>` para Departamento Ejecutivo y `2-<código de categoría>-<correlativo>` para Honorable Concejo Deliberante. El correlativo es independiente por organismo y rubro, no se reutiliza y la vista previa no consume el número; la asignación definitiva se hace al guardar.

Alternativa evaluada para el QR (no implementada):

- Ficha pública por token opaco, por ejemplo `/p/{token}`, sin login.
- Muestra solo datos seguros: código, descripción, rubro, estado, área y fecha de alta.
- No incluye foto, datos personales, valores, documentos ni observaciones.
- No incluye “reportar problema”.
- Requiere campo `publicToken` único, endpoint público de solo lectura, rate limiting y un dominio estable configurado en `VITE_PUBLIC_APP_URL`.

Decisión actual: el QR contiene texto sin conexión con código, descripción, marca, modelo y dominio cuando corresponde.

Impresión de etiquetas:

- Configuración por usuario guardada en `Usuario.configuracionEtiqueta` (JSON), disponible en cualquier PC al iniciar sesión.
- Presets A4 y ajuste manual de hoja, grilla, márgenes, separación y tamaño del QR.
- Selector visual de celda inicial por impresión; permite reutilizar una hoja parcialmente usada.
- La celda inicial no se guarda en la configuración permanente.
- El motor de impresión acepta varias etiquetas y páginas para habilitar la impresión por lote en una fase posterior.
- Para calibrar la impresora se incluye una prueba que imprime la grilla numerada sin QR.

### 4.4 Consumibles

Campos mínimos:

- Nombre.
- Categoría.
- Unidad de medida.
- Stock actual.
- Stock mínimo.
- Activo/inactivo.

Funcionalidades:

- Alta, edición y baja de consumibles.
- Registro de ingresos.
- Registro de entregas por área.
- Ajustes de inventario.
- Historial de movimientos.
- Alerta de stock mínimo.
- Reporte operativo de stock y consumo por área.

### 4.5 Compras e ingresos simples

Objetivo: dar entrada a bienes y consumibles sin implementar todavía el circuito formal de compras.

Cabecera:

- Fecha.
- Proveedor.
- Tipo, número y fecha de comprobante.
- Observaciones.
- Área destino, si corresponde.

Detalle:

- Bien o consumible.
- Cantidad.
- Precio unitario.
- Descripción.

Efectos:

- Los bienes ingresados se crean o vinculan en el inventario.
- Los consumibles generan movimiento de ingreso y actualizan stock.
- La compra queda asociada a los bienes y consumibles.
- El comprobante queda registrado como dato de la compra, sin archivos adjuntos.

No incluye en Etapa 1:

- Expediente de compra.
- Orden de pago formal.
- Acta de recepción con firma.
- Circuito de autorizaciones.

### 4.6 Movimientos de custodia y ubicación

- Asignación de un bien a un subresponsable.
- Transferencia entre subresponsables.
- Devolución.
- Cambio de área o dependencia.
- Historial por bien.
- Observaciones y fecha de cada movimiento.

Las actas de entrega y recepción ya cuentan con PDF operativo. Los dispositivos de designación quedan para Etapa 2.

### 4.7 Dashboard y reportes operativos

Indicadores:

- Total de bienes activos.
- Bienes por rubro.
- Bienes por área.
- Bienes sin responsable asignado.
- Bienes sin ubicación.
- Consumibles con stock bajo.
- Últimos movimientos.

Reportes operativos:

- Listado de bienes por área.
- Listado de bienes por responsable.
- Listado de consumibles con stock.
- Movimientos de stock por área.
- Compras/ingresos del período.

Los cinco reportes se pueden consultar en pantalla y generar en PDF operativo con encabezado institucional, filtros aplicados, fecha de emisión, totales y numeración de páginas. Sin formato oficial del HTC en Etapa 1.

### 4.8 Auditoría

- Registrar quién creó, modificó o dio de baja cada registro.
- Guardar fecha y datos anteriores/nuevos.
- Registrar inicios de sesión y cambios de usuarios.
- Consulta de auditoría solo para Contable.

---

## 5. Modelo de datos mínimo de Etapa 1

Entidades principales:

| Entidad | Uso |
|---|---|
| `usuarios` | Login, rol y estado. |
| `rubros` | Clasificación de bienes. |
| `estados_bien` | Estado operativo del bien. |
| `areas` | Dependencias municipales. |
| `personas` | Responsables y subresponsables. |
| `bienes` | Bienes registrables. |
| `consumibles` | Catálogo de consumibles. |
| `movimientos_stock` | Ingresos, entregas y ajustes. |
| `compras` | Cabecera simple de compra/ingreso. |
| `compras_detalle` | Bienes o consumibles ingresados. |
| `movimientos_custodia` | Historial de responsables. |
| `movimientos_ubicacion` | Historial de áreas. |
| `auditoria` | Log de operaciones. |

### 5.1 Campos preparados para Etapa 2

Aunque la interfaz de Etapa 1 no los muestre, conviene crear desde el inicio estos campos opcionales para evitar migraciones y recarga de datos:

- `bienes.numero_orden_pago`.
- `bienes.numero_resolucion_baja`.
- `bienes.fecha_resolucion_baja`.
- `bienes.valor_baja`.
- `bienes.ejercicio_alta`.
- `rubros.codigo_cuenta`.
- `compras.numero_expediente`.

En Etapa 2 se agregarán:

- `cierres_ejercicio`.
- `presentaciones_libro`.
- `firmas_libro`.
- `rubrica_digital`.
- `conciliaciones`.
- `verificaciones`.
- `siniestros`.
- `importaciones`.

---

## 6. Fuera de alcance de Etapa 1

- Importación masiva desde Excel.
- Documentación adjunta y almacenamiento de archivos en la base de datos.
- Libros y planillas del HTC (Modelos 20, 21 y 22).
- Rúbrica digital.
- Cierres por ejercicio.
- Conciliación contable.
- Compras formales con expediente y orden de pago.
- Actas y dispositivos en PDF con firma.
- Campañas de verificación física.
- Módulo completo de siniestros.
- Reportes oficiales en Excel/PDF.
- Modo offline.

---

## 7. Fases de Etapa 1

### Fase 1 — Base y seguridad (semanas 1-2)

- Crear repositorio y estructura Express + Prisma + React.
- Configurar base de datos.
- Implementar login, roles y auditoría básica.
- CRUD de usuarios.
- CRUD de catálogos: rubros, estados, áreas, personas, tipos.

### Fase 2 — Bienes registrables (semanas 3-5)

- CRUD de bienes.
- Código único.
- QR y etiqueta.
- Ficha del bien.
- Búsqueda y filtros.
- Historial de custodia y ubicación.

### Fase 3 — Consumibles y stock (semanas 6-7)

- CRUD de consumibles.
- Ingresos, entregas y ajustes.
- Stock actual y mínimo.
- Alertas.
- Reporte de stock y consumo por área.

### Fase 4 — Compras simples e integración (semana 8)

- Cabecera y detalle de compras/ingresos.
- Vinculación con bienes y consumibles.
- Dashboard operativo.
- Reportes operativos.
- Pruebas integrales y puesta en marcha.

---

## 8. Etapa 2 — Alcance contable y HTC

### 8.1 Libros obligatorios

- Planilla de Altas y Bajas (trimestral).
- Registro Permanente de Inventario (anual, Modelo 20).
- Registro de Bajas de Inventario Histórico (anual, Modelo 21).
- Planilla de Altas y Bajas (Modelo 22).

### 8.2 Cierres y presentaciones

- Cierre por ejercicio.
- Congelamiento de datos del libro.
- Generación de archivos con formato oficial.
- Registro de presentación.
- Rúbrica digital.
- Control de firmas, especialmente del Contador Municipal.
- Alertas de vencimientos trimestrales y anuales.

### 8.3 Conciliación contable

- Mapeo de rubros a códigos de cuenta.
- Comparación del total del inventario contra los saldos contables.
- Registro de diferencias y ajustes.
- Reporte de conciliación.

### 8.4 Compras formales

- Expedientes.
- Órdenes de pago.
- Actas de recepción.
- Circuito de autorizaciones.

### 8.5 Otros módulos

- Verificación física por campañas.
- Siniestros y notificación al HTC.
- Importación masiva de datos históricos.
- Reportes oficiales en Excel y PDF.
- Actas y dispositivos con firma.

---

## 9. Relación con el plan original

El documento `planificacion-patrimonio-garupa.md` sigue siendo la referencia de:

- Marco normativo.
- Libros obligatorios.
- Plazos del HTC.
- Modelo de datos completo.
- Documentos PDF.
- Calendario de presentaciones.

Este documento cambia únicamente el orden de implementación:

1. Primero se resuelve la operación diaria de Patrimonio.
2. Después se agrega la capa contable y los libros oficiales.

---

## 10. Riesgos de Etapa 1

| Riesgo | Mitigación |
|---|---|
| Carga manual inicial lenta | Formularios simples, catálogos precargados y validaciones claras. |
| Datos incompletos | Campos obligatorios por rubro y checklist de datos mínimos. |
| Duplicación de bienes | Código único y búsqueda por número de serie/patente. |
| Resistencia al cambio | Interfaz simple y flujo guiado para el encargado. |
| Crecimiento del alcance | Etapa 2 cerrada y fuera de alcance de Etapa 1. |
| Pérdida de etiquetas | Reimpresión desde la ficha del bien. |

---

## 11. Criterios de éxito de Etapa 1

- El Encargado de Patrimonio puede cargar todos los bienes sin usar planillas externas.
- Puede encontrar cualquier bien por código, descripción, área o responsable.
- Puede saber quién tiene cada bien y dónde está.
- Puede imprimir y reimprimir etiquetas QR.
- Puede registrar ingresos y entregas de consumibles.
- Puede ver el stock actual y las alertas de stock mínimo.
- El Contable puede administrar usuarios y acceder a toda la información.
- Patrimonio no accede a módulos contables.

---

## 12. Próximos pasos

1. Validar este alcance con el Encargado de Patrimonio y Contaduría.
2. Validar con Contaduría el formato implementado (`1/2-categoría-correlativo`) y los datos iniciales.
3. Relevar áreas, personas y rubros iniciales.
4. Confirmar si Patrimonio debe ver el valor histórico del bien.
5. Arrancar la Fase 1 de Etapa 1.
6. Obtener los modelos oficiales del HTC antes de iniciar Etapa 2.
