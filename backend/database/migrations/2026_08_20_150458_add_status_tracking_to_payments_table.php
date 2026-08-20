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
            // Quando o status mudou pela última vez — proxy pra saber "há
            // quanto tempo isso foi cancelado/estornado" (não temos o
            // timestamp exato do ML, só quando NÓS observamos a mudança).
            $table->timestamp('status_changed_at')->nullable()->after('status');
            // Primeira vez que vimos esse pagamento em mediação — fica
            // preenchido pra sempre, mesmo depois da mediação resolver, pra
            // dar pra distinguir "nunca foi mediado" de "mediação resolvida".
            $table->timestamp('mediation_detected_at')->nullable()->after('status_changed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['status_changed_at', 'mediation_detected_at']);
        });
    }
};
