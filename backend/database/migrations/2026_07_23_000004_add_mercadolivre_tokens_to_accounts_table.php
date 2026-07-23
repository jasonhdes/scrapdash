<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('mercadolivre_user_id')->nullable()->after('marketplace');
            $table->text('mercadolivre_access_token')->nullable()->after('mercadolivre_user_id');
            $table->text('mercadolivre_refresh_token')->nullable()->after('mercadolivre_access_token');
            $table->timestamp('mercadolivre_token_expires_at')->nullable()->after('mercadolivre_refresh_token');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn([
                'mercadolivre_user_id',
                'mercadolivre_access_token',
                'mercadolivre_refresh_token',
                'mercadolivre_token_expires_at',
            ]);
        });
    }
};
