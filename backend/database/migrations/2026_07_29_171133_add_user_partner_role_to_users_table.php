<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Alterar um enum via Schema::table()->change() exige doctrine/dbal
        // (não instalado neste projeto) — SQL bruto é mais simples aqui.
        // SQLite (usado nos testes) não tem ALTER COLUMN nem ENUM de verdade;
        // o driver já trata a coluna como texto livre, então não precisa
        // (nem consegue) rodar esse ALTER lá.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('master', 'user', 'user_partner') NOT NULL DEFAULT 'user'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('master', 'user') NOT NULL DEFAULT 'user'");
        }
    }
};
