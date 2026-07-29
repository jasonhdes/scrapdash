<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Scaffold do Sprint 2 (name/email/senha, sem role/permissões, sem
        // controller/rotas — nunca chegou a ser usado, tabela vazia). O
        // Sprint 9 decidiu que "Funcionário" é o mesmo conceito de "User
        // Partner": um User de verdade (role=user_partner) com acesso via
        // account_user, não um registro à parte sem login próprio.
        Schema::dropIfExists('employees');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamps();
        });
    }
};
