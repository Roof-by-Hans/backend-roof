-- Migración: Agregar columna foto_perfil a tabla Usuario
-- Fecha: 2026-03-05
-- Descripción: Permite almacenar el nombre del archivo de foto de perfil del usuario

-- Verificar si la columna ya existe antes de agregarla
SET @dbname = DATABASE();
SET @tablename = "Usuario";
SET @columnname = "foto_perfil";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(255) NULL AFTER contrasena")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar que la columna fue agregada exitosamente
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Columna foto_perfil agregada/existe correctamente'
        ELSE 'Error: La columna foto_perfil no existe'
    END AS resultado
FROM INFORMATION_SCHEMA.COLUMNS
WHERE table_schema = DATABASE()
  AND table_name = 'Usuario'
  AND column_name = 'foto_perfil';
