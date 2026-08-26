<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Quando um pedido é na verdade um "pacote" com vários itens
            // comprados juntos, cada item tem seu próprio número de venda
            // no Mercado Livre — guarda aqui pra dar pra conferir a partir
            // do pedido "pai".
            $table->string('child_order_number')->nullable()->after('mercadolivre_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('child_order_number');
        });
    }
};
