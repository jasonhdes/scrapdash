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
        Schema::table('payments', function (Blueprint $table) {
            // null = ainda não verificado; true/false = já checamos na API
            // se o frete foi de fato cobrado do vendedor no cancelamento.
            $table->boolean('shipping_charged_on_cancel')->nullable()->after('shipping_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('shipping_charged_on_cancel');
        });
    }
};
