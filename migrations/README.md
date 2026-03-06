# Migraciones de Base de Datos

Este directorio contiene los scripts SQL para migrar la base de datos del proyecto.

## Cómo ejecutar las migraciones

### Opción 1: Desde HeidiSQL (Recomendado para desarrollo)

1. Abre HeidiSQL y conéctate a tu base de datos `db_facultad`
2. Abre el archivo de migración: `Archivo > Ejecutar archivo SQL`
3. Selecciona el archivo `001_agregar_foto_perfil.sql`
4. Haz clic en "Ejecutar"
5. Verifica el mensaje de resultado al final del script

### Opción 2: Desde la línea de comandos

```bash
# Navega al directorio del backend
cd backend-roof

# Ejecuta la migración
mysql -u root -p db_facultad < migrations/001_agregar_foto_perfil.sql
```

### Opción 3: Desde Node.js (si tienes script de migraciones)

```bash
npm run migrate
```

## Lista de Migraciones

| Archivo | Fecha | Descripción |
|---------|-------|-------------|
| `001_agregar_foto_perfil.sql` | 2026-03-05 | Agrega columna `foto_perfil` a tabla Usuario para almacenar fotos de perfil |

## Notas Importantes

- Las migraciones verifican si la columna ya existe antes de agregarla (son idempotentes)
- Siempre haz un backup de la base de datos antes de ejecutar migraciones en producción
- Las migraciones deben ejecutarse en orden numérico (001, 002, 003...)
- Después de ejecutar una migración, confirma que funcionó correctamente antes de continuar

## Para nuevos desarrolladores

Si eres nuevo en el proyecto, ejecuta todas las migraciones en orden:

```bash
mysql -u root -p db_facultad < migrations/001_agregar_foto_perfil.sql
# Agregar futuras migraciones aquí...
```

O simplemente ejecuta cada archivo desde HeidiSQL en orden numérico.
