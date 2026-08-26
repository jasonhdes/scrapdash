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
        // Lançamento de caixa manual e independente de pedidos/produtos —
        // só data, descrição e valor. Entra direto na conta assim que
        // criado, sem checkbox de conferência (lançar já é confirmar).
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->date('occurred_at');
            $table->string('description');
            $table->decimal('value', 12, 2);
            $table->timestamps();

            $table->index(['account_id', 'occurred_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchases');
    }
};
