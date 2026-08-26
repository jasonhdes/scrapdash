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
        // Trilha de auditoria: toda vez que a sincronização automática cria
        // ou muda o valor de um evento em `order_returns`, um snapshot é
        // gravado aqui. Diferente de `order_returns` (que tem no máximo 1
        // linha por pedido+status, sempre refletindo o estado atual), esta
        // tabela é append-only e nunca é atualizada/apagada — é o histórico
        // completo visível na página de detalhes do pedido.
        Schema::create('order_return_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status');
            $table->dateTime('occurred_at');
            $table->string('buyer_name')->nullable();
            $table->decimal('value', 10, 2)->default(0);
            $table->string('product_name')->nullable();
            $table->enum('source', ['auto', 'manual'])->default('auto');
            $table->timestamps();

            $table->index(['account_id', 'order_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_return_histories');
    }
};
