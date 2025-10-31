-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema hansdev
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema hansdev
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `hansdev` ;
USE `hansdev` ;

-- -----------------------------------------------------
-- Table `hansdev`.`CajaDiaria`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`CajaDiaria` (
  `id_caja` INT(11) NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL,
  `fecha_apertura` DATETIME NULL DEFAULT NULL,
  `fecha_cierre` DATETIME NULL DEFAULT NULL,
  `monto_inicial` DECIMAL(12,2) NULL DEFAULT 0.00,
  `monto_final` DECIMAL(12,2) NULL DEFAULT 0.00,
  `estado` ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
  `creado_por` INT(11) NULL DEFAULT NULL,
  `cerrado_por` INT(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id_caja`),
  UNIQUE INDEX `uq_fecha` (`fecha` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `hansdev`.`AuditoriaCaja`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`AuditoriaCaja` (
  `id_auditoria` INT(11) NOT NULL AUTO_INCREMENT,
  `id_caja` INT(11) NOT NULL,
  `fecha` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(),
  `monto_inicial` DECIMAL(12,2) NOT NULL,
  `total_dia` DECIMAL(12,2) NOT NULL,
  `monto_calculado` DECIMAL(12,2) NOT NULL,
  `monto_final` DECIMAL(12,2) NOT NULL,
  `diferencia` DECIMAL(12,2) NOT NULL,
  `id_usuario` INT(11) NOT NULL,
  `observacion` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id_auditoria`),
  INDEX `id_caja` (`id_caja` ASC) VISIBLE,
  CONSTRAINT `AuditoriaCaja_ibfk_1`
    FOREIGN KEY (`id_caja`)
    REFERENCES `hansdev`.`CajaDiaria` (`id_caja`)
    ON DELETE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `hansdev`.`CategoriaProducto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`CategoriaProducto` (
  `id_categoria` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `id_cat_padre` INT(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  INDEX `fk_categoria_padre` (`id_cat_padre` ASC) VISIBLE,
  CONSTRAINT `fk_categoria_padre`
    FOREIGN KEY (`id_cat_padre`)
    REFERENCES `hansdev`.`CategoriaProducto` (`id_categoria`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 5;


-- -----------------------------------------------------
-- Table `hansdev`.`TipoSuscripcion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`TipoSuscripcion` (
  `id_tipo` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` ENUM('PREPAGA', 'CREDITO') NOT NULL,
  PRIMARY KEY (`id_tipo`))
ENGINE = InnoDB
AUTO_INCREMENT = 3;


-- -----------------------------------------------------
-- Table `hansdev`.`NivelSuscripcion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`NivelSuscripcion` (
  `id_nivel` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `limite_credito` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id_nivel`))
ENGINE = InnoDB
AUTO_INCREMENT = 3;


-- -----------------------------------------------------
-- Table `hansdev`.`Tarjeta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`Tarjeta` (
  `id_tarjeta` INT(11) NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(100) NOT NULL,
  `id_tipo_suscripcion` INT(11) NOT NULL,
  `id_nivel_suscripcion` INT(11) NULL DEFAULT NULL,
  `saldo_actual` DECIMAL(12,2) NULL DEFAULT 0.00,
  `estado` VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
  `fecha_creacion` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id_tarjeta`),
  UNIQUE INDEX `uuid` (`uuid` ASC) VISIBLE,
  INDEX `id_tipo_suscripcion` (`id_tipo_suscripcion` ASC) VISIBLE,
  INDEX `id_nivel_suscripcion` (`id_nivel_suscripcion` ASC) VISIBLE,
  CONSTRAINT `Tarjeta_ibfk_1`
    FOREIGN KEY (`id_tipo_suscripcion`)
    REFERENCES `hansdev`.`TipoSuscripcion` (`id_tipo`),
  CONSTRAINT `Tarjeta_ibfk_2`
    FOREIGN KEY (`id_nivel_suscripcion`)
    REFERENCES `hansdev`.`NivelSuscripcion` (`id_nivel`))
ENGINE = InnoDB
AUTO_INCREMENT = 10;


-- -----------------------------------------------------
-- Table `hansdev`.`Cliente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`Cliente` (
  `id_cliente` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  `telefono` VARCHAR(50) NULL DEFAULT NULL,
  `email` VARCHAR(100) NOT NULL,
  `contrasena` VARCHAR(255) NOT NULL,
  `id_tarjeta` INT(11) NULL DEFAULT NULL,
  `foto_perfil` VARCHAR(255) NULL DEFAULT NULL,
  `preferencias` MEDIUMTEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id_cliente`),
  UNIQUE INDEX `email` (`email` ASC) VISIBLE,
  UNIQUE INDEX `id_tarjeta` (`id_tarjeta` ASC) VISIBLE,
  CONSTRAINT `Cliente_ibfk_1`
    FOREIGN KEY (`id_tarjeta`)
    REFERENCES `hansdev`.`Tarjeta` (`id_tarjeta`))
ENGINE = InnoDB
AUTO_INCREMENT = 9;


-- -----------------------------------------------------
-- Table `hansdev`.`Mesa`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`Mesa` (
  `id_mesa` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `estado` ENUM('DISPONIBLE', 'OCUPADA') NOT NULL DEFAULT 'DISPONIBLE',
  `id_cliente_actual` INT(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id_mesa`),
  INDEX `fk_mesa_cliente_actual` (`id_cliente_actual` ASC) VISIBLE,
  INDEX `idx_mesa_estado` (`estado` ASC) VISIBLE,
  CONSTRAINT `fk_mesa_cliente_actual`
    FOREIGN KEY (`id_cliente_actual`)
    REFERENCES `hansdev`.`Cliente` (`id_cliente`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 12;


-- -----------------------------------------------------
-- Table `hansdev`.`GrupoMesas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`GrupoMesas` (
  `id_grupo` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_grupo`))
ENGINE = InnoDB
AUTO_INCREMENT = 2;


-- -----------------------------------------------------
-- Table `hansdev`.`Factura`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`Factura` (
  `id_factura` INT(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` INT(11) NOT NULL,
  `id_mesa` INT(11) NULL DEFAULT NULL,
  `id_grupo` INT(11) NULL DEFAULT NULL,
  `fecha` DATETIME NOT NULL,
  `estado` ENUM('PENDIENTE', 'COBRADA', 'ANULADA') NOT NULL,
  `total` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id_factura`),
  INDEX `id_cliente` (`id_cliente` ASC) VISIBLE,
  INDEX `id_mesa` (`id_mesa` ASC) VISIBLE,
  INDEX `fk_factura_grupo` (`id_grupo` ASC) VISIBLE,
  CONSTRAINT `Factura_ibfk_1`
    FOREIGN KEY (`id_cliente`)
    REFERENCES `hansdev`.`Cliente` (`id_cliente`),
  CONSTRAINT `Factura_ibfk_2`
    FOREIGN KEY (`id_mesa`)
    REFERENCES `hansdev`.`Mesa` (`id_mesa`),
  CONSTRAINT `fk_factura_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `hansdev`.`GrupoMesas` (`id_grupo`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 6;


-- -----------------------------------------------------
-- Table `hansdev`.`Producto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`Producto` (
  `id_producto` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `precio_unitario` DECIMAL(12,2) NOT NULL,
  `id_categoria` INT(11) NOT NULL,
  `foto_principal` VARCHAR(255) NULL DEFAULT NULL,
  `descripcion` MEDIUMTEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  INDEX `id_categoria` (`id_categoria` ASC) VISIBLE,
  CONSTRAINT `Producto_ibfk_1`
    FOREIGN KEY (`id_categoria`)
    REFERENCES `hansdev`.`CategoriaProducto` (`id_categoria`))
ENGINE = InnoDB
AUTO_INCREMENT = 6;


-- -----------------------------------------------------
-- Table `hansdev`.`DetalleFactura`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`DetalleFactura` (
  `id_detalle` INT(11) NOT NULL AUTO_INCREMENT,
  `id_factura` INT(11) NOT NULL,
  `id_producto` INT(11) NOT NULL,
  `cantidad` INT(11) NOT NULL,
  `precio_unitario` DECIMAL(12,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id_detalle`),
  INDEX `id_factura` (`id_factura` ASC) VISIBLE,
  INDEX `id_producto` (`id_producto` ASC) VISIBLE,
  CONSTRAINT `DetalleFactura_ibfk_1`
    FOREIGN KEY (`id_factura`)
    REFERENCES `hansdev`.`Factura` (`id_factura`),
  CONSTRAINT `DetalleFactura_ibfk_2`
    FOREIGN KEY (`id_producto`)
    REFERENCES `hansdev`.`Producto` (`id_producto`))
ENGINE = InnoDB
AUTO_INCREMENT = 6;


-- -----------------------------------------------------
-- Table `hansdev`.`MedioPago`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`MedioPago` (
  `id_medio_pago` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_medio_pago`),
  UNIQUE INDEX `uq_nombre` (`nombre` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 4;


-- -----------------------------------------------------
-- Table `hansdev`.`MesaGrupo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`MesaGrupo` (
  `id_grupo` INT(11) NOT NULL,
  `id_mesa` INT(11) NOT NULL,
  PRIMARY KEY (`id_grupo`, `id_mesa`),
  INDEX `fk_mesagrupo_mesa` (`id_mesa` ASC) VISIBLE,
  CONSTRAINT `fk_mesagrupo_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `hansdev`.`GrupoMesas` (`id_grupo`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_mesagrupo_mesa`
    FOREIGN KEY (`id_mesa`)
    REFERENCES `hansdev`.`Mesa` (`id_mesa`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `hansdev`.`MovimientoCaja`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`MovimientoCaja` (
  `id_mov_caja` INT(11) NOT NULL AUTO_INCREMENT,
  `id_caja` INT(11) NOT NULL,
  `id_cliente` INT(11) NULL DEFAULT NULL,
  `tipo` ENUM('INGRESO', 'EGRESO', 'AJUSTE', 'APERTURA', 'CIERRE', 'DEVOLUCION') NOT NULL,
  `id_medio_pago` INT(11) NULL DEFAULT NULL,
  `monto` DECIMAL(12,2) NOT NULL,
  `concepto` VARCHAR(255) NULL DEFAULT NULL,
  `id_usuario` INT(11) NULL DEFAULT NULL,
  `id_movimiento_cuenta` INT(11) NULL DEFAULT NULL,
  `fecha` DATETIME NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id_mov_caja`),
  INDEX `id_caja` (`id_caja` ASC) VISIBLE,
  INDEX `ix_movcaja_fecha` (`fecha` ASC) VISIBLE,
  INDEX `fk_movcaja_mediopago` (`id_medio_pago` ASC) VISIBLE,
  CONSTRAINT `MovimientoCaja_ibfk_1`
    FOREIGN KEY (`id_caja`)
    REFERENCES `hansdev`.`CajaDiaria` (`id_caja`),
  CONSTRAINT `fk_movcaja_mediopago`
    FOREIGN KEY (`id_medio_pago`)
    REFERENCES `hansdev`.`MedioPago` (`id_medio_pago`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `hansdev`.`TipoMovimiento`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`TipoMovimiento` (
  `id_tipo_mov` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id_tipo_mov`),
  UNIQUE INDEX `nombre` (`nombre` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 4;


-- -----------------------------------------------------
-- Table `hansdev`.`MovimientoCuenta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`MovimientoCuenta` (
  `id_movimiento` INT(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` INT(11) NOT NULL,
  `id_tarjeta` INT(11) NULL DEFAULT NULL,
  `fecha` DATETIME NOT NULL,
  `monto` DECIMAL(12,2) NOT NULL,
  `id_tipo_mov` INT(11) NULL DEFAULT NULL,
  `id_factura` INT(11) NULL DEFAULT NULL,
  `id_usuario` INT(11) NULL DEFAULT NULL,
  `observaciones` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id_movimiento`),
  INDEX `id_factura` (`id_factura` ASC) VISIBLE,
  INDEX `ix_movcue_cliente` (`id_cliente` ASC) VISIBLE,
  INDEX `ix_movcue_tarjeta` (`id_tarjeta` ASC) VISIBLE,
  INDEX `ix_movcue_fecha` (`fecha` ASC) VISIBLE,
  INDEX `fk_movcue_tipo` (`id_tipo_mov` ASC) VISIBLE,
  CONSTRAINT `MovimientoCuenta_ibfk_1`
    FOREIGN KEY (`id_cliente`)
    REFERENCES `hansdev`.`Cliente` (`id_cliente`),
  CONSTRAINT `MovimientoCuenta_ibfk_2`
    FOREIGN KEY (`id_factura`)
    REFERENCES `hansdev`.`Factura` (`id_factura`),
  CONSTRAINT `fk_movcue_tarjeta`
    FOREIGN KEY (`id_tarjeta`)
    REFERENCES `hansdev`.`Tarjeta` (`id_tarjeta`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_movcue_tipo`
    FOREIGN KEY (`id_tipo_mov`)
    REFERENCES `hansdev`.`TipoMovimiento` (`id_tipo_mov`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 8;


-- -----------------------------------------------------
-- Table `hansdev`.`Rol`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`Rol` (
  `id_rol` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_rol`))
ENGINE = InnoDB
AUTO_INCREMENT = 5;


-- -----------------------------------------------------
-- Table `hansdev`.`Usuario`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`Usuario` (
  `id_usuario` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre_usuario` VARCHAR(50) NOT NULL,
  `contrasena` VARCHAR(255) NOT NULL,
  `activo` TINYINT(1) NULL DEFAULT 1,
  `foto_perfil` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE INDEX `nombre_usuario` (`nombre_usuario` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 3;


-- -----------------------------------------------------
-- Table `hansdev`.`UsuarioMesa`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`UsuarioMesa` (
  `id_usuario` INT(11) NOT NULL,
  `id_mesa` INT(11) NOT NULL,
  PRIMARY KEY (`id_usuario`, `id_mesa`),
  INDEX `id_mesa` (`id_mesa` ASC) VISIBLE,
  CONSTRAINT `UsuarioMesa_ibfk_1`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `hansdev`.`Usuario` (`id_usuario`),
  CONSTRAINT `UsuarioMesa_ibfk_2`
    FOREIGN KEY (`id_mesa`)
    REFERENCES `hansdev`.`Mesa` (`id_mesa`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `hansdev`.`UsuarioRol`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`UsuarioRol` (
  `id_usuario` INT(11) NOT NULL,
  `id_rol` INT(11) NOT NULL,
  PRIMARY KEY (`id_usuario`, `id_rol`),
  INDEX `id_rol` (`id_rol` ASC) VISIBLE,
  CONSTRAINT `UsuarioRol_ibfk_1`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `hansdev`.`Usuario` (`id_usuario`),
  CONSTRAINT `UsuarioRol_ibfk_2`
    FOREIGN KEY (`id_rol`)
    REFERENCES `hansdev`.`Rol` (`id_rol`))
ENGINE = InnoDB;

USE `hansdev` ;

-- -----------------------------------------------------
-- Placeholder table for view `hansdev`.`vw_mesas_con_grupo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hansdev`.`vw_mesas_con_grupo` (`id_mesa` INT, `nombre_mesa` INT, `estado_mesa` INT, `id_cliente_actual` INT, `id_grupo` INT, `nombre_grupo` INT);

-- -----------------------------------------------------
-- procedure sp_recalcular_saldos
-- -----------------------------------------------------

DELIMITER $$
USE `hansdev`$$
CREATE DEFINER=`hansdev`@`%` PROCEDURE `sp_recalcular_saldos`()
BEGIN
  -- Para cada tarjeta, recalcular saldo a partir del ledger:
  UPDATE Tarjeta t
  JOIN (
    SELECT m.id_tarjeta,
      COALESCE(SUM(
        CASE tm.nombre
          WHEN 'RECARGA' THEN m.monto
          WHEN 'CONSUMO' THEN -m.monto
          WHEN 'AJUSTE' THEN m.monto
          ELSE 0
        END
      ),0) AS saldo_calc
    FROM MovimientoCuenta m
    JOIN tipo_movimiento tm ON m.id_tipo_mov = tm.id_tipo_mov
    WHERE m.id_tarjeta IS NOT NULL
    GROUP BY m.id_tarjeta
  ) s ON t.id_tarjeta = s.id_tarjeta
  SET t.saldo_actual = s.saldo_calc;
END$$

DELIMITER ;

-- -----------------------------------------------------
-- View `hansdev`.`vw_mesas_con_grupo`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `hansdev`.`vw_mesas_con_grupo`;
USE `hansdev`;
CREATE  OR REPLACE ALGORITHM=UNDEFINED DEFINER=`hansdev`@`%` SQL SECURITY DEFINER VIEW `hansdev`.`vw_mesas_con_grupo` AS select `m`.`id_mesa` AS `id_mesa`,`m`.`nombre` AS `nombre_mesa`,`m`.`estado` AS `estado_mesa`,`m`.`id_cliente_actual` AS `id_cliente_actual`,`g`.`id_grupo` AS `id_grupo`,`g`.`nombre` AS `nombre_grupo` from ((`hansdev`.`Mesa` `m` left join `hansdev`.`MesaGrupo` `mg` on(`m`.`id_mesa` = `mg`.`id_mesa`)) left join `hansdev`.`GrupoMesas` `g` on(`mg`.`id_grupo` = `g`.`id_grupo`));

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
