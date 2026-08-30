-- Guarda el archivo original (remito PDF o foto de ticket) cuando una
-- compra se carga importando el documento en vez de a mano, para poder
-- volver a mirarlo ante cualquier diferencia con lo recibido.
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "sourceFileUrl" TEXT,
  ADD COLUMN "sourceType" TEXT;
