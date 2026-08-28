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
        // Digitados manualmente pelo usuário conferindo o app/site do
        // Mercado Pago — não são calculados nem sincronizados via API (não
        // temos acesso ao saldo real deles). Ficam na conta, não no
        // período: representam "o que o Mercado Pago mostra agora", não
        // algo que reinicia a cada fechamento.
        Schema::table('accounts', function (Blueprint $table) {
            $table->decimal('mercadopago_pending_balance', 12, 2)->nullable()->after('mercadolivre_token_expires_at');
            $table->decimal('mercadopago_available_balance', 12, 2)->nullable()->after('mercadopago_pending_balance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['mercadopago_pending_balance', 'mercadopago_available_balance']);
        });
    }
};
