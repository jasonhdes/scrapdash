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
        // Livro-caixa de fechamento por período: cada linha é um período,
        // com os 5 valores que o usuário confere/ajusta manualmente no
        // Mercado Pago (a API não dá acesso ao saldo real). "Despesas" não
        // tem coluna aqui de propósito — continua sendo a soma da tabela
        // `purchases` já existente, na janela deste período.
        // `closed_at` nulo = é o período aberto/atual da conta.
        Schema::create('financial_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->decimal('previous_balance', 12, 2)->default(0);
            $table->decimal('total_sales', 12, 2)->default(0);
            $table->decimal('held_balance', 12, 2)->default(0);
            $table->decimal('refunded_balance', 12, 2)->default(0);
            $table->decimal('discounts', 12, 2)->default(0);
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'closed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_periods');
    }
};
