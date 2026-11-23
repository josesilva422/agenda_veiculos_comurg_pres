-- Segurança no Supabase: as tabelas do schema "public" ficam expostas pela API REST do Supabase.
-- Ligar o RLS (sem nenhuma política) bloqueia qualquer acesso por essa API (chaves anon/authenticated).
-- O sistema não usa essa API: acessa o banco pelo Prisma, com o usuário dono das tabelas, que não é afetado pelo RLS.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginTentativa" ENABLE ROW LEVEL SECURITY;
