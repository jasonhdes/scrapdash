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
        Schema::create('order_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status');
            $table->date('occurred_at');
            $table->string('buyer_name')->nullable();
            $table->decimal('value', 10, 2)->default(0);
            $table->string('product_name')->nullable();
            $table->boolean('verified')->default(false);
            $table->enum('source', ['auto', 'manual'])->default('manual');
            $table->timestamps();

            // Impede duplicar o mesmo evento (pedido + categoria) toda vez
            // que a sincronização automática roda de novo.
            $table->unique(['account_id', 'order_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_returns');
    }
};
