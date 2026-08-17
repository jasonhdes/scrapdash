<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_status')->nullable()->after('shipping_id');
            $table->string('shipping_substatus')->nullable()->after('shipping_status');
            $table->timestamp('shipping_status_synced_at')->nullable()->after('shipping_substatus');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['shipping_status', 'shipping_substatus', 'shipping_status_synced_at']);
        });
    }
};
