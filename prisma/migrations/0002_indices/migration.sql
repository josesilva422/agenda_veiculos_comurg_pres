-- Índices para filtros frequentes (calendário, relatórios, painel, notificações, auditoria)
CREATE INDEX "Booking_inicio_idx" ON "Booking"("inicio");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Notification_userId_lida_idx" ON "Notification"("userId", "lida");
CREATE INDEX "BookingHistory_bookingId_idx" ON "BookingHistory"("bookingId");
CREATE INDEX "BookingHistory_criadoEm_idx" ON "BookingHistory"("criadoEm");
