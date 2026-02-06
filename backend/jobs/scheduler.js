const { fetchGovInternships } = require('../services/sources/govApi');
const { fetchPartnerInternships } = require('../services/sources/partnerApi');
const { normalizeInternship, upsertInternship } = require('../services/ingestionService');

const runIngestionJob = async () => {
    console.log('🚀 Starting Scheduled Ingestion Job...');

    try {
        // 1. Fetch from Government Source
        const govData = await fetchGovInternships();
        console.log(`📥 Received ${govData.length} records from Gov API.`);

        let stats = { inserted: 0, updated: 0, failed: 0 };

        const govIds = [];
        for (const record of govData) {
            try {
                const normalized = normalizeInternship(record, 'GOV_PORTAL');
                govIds.push(normalized.source_id); // Collect ID
                const result = await upsertInternship(normalized);
                if (result.status === 'inserted') stats.inserted++;
                else stats.updated++;
            } catch (e) {
                console.error('Failed to process Gov record:', e.message);
                stats.failed++;
            }
        }

        // 2. Fetch from Partner Source
        const partnerData = await fetchPartnerInternships();
        console.log(`📥 Received ${partnerData.length} records from Partner API.`);

        const partnerIds = [];
        for (const record of partnerData) {
            try {
                const normalized = normalizeInternship(record, 'PARTNER_API');
                partnerIds.push(normalized.source_id); // Collect ID
                const result = await upsertInternship(normalized);
                if (result.status === 'inserted') stats.inserted++;
                else stats.updated++;
            } catch (e) {
                console.error('Failed to process Partner record:', e.message);
                stats.failed++;
            }
        }

        // 3. Process Soft Deletes (Sync)
        const { processSoftDeletes } = require('../services/ingestionService');
        const govDel = await processSoftDeletes('GOV_PORTAL', govIds);
        const partDel = await processSoftDeletes('PARTNER_API', partnerIds);

        stats.deleted = (govDel.deleted || 0) + (partDel.deleted || 0);

        console.log(`✅ Ingestion Complete. Stats:`, stats);

    } catch (error) {
        console.error('🔥 Ingestion Job Failed:', error);
    }
};

// If called directly via node
if (require.main === module) {
    const path = require('path');
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    runIngestionJob().then(() => process.exit());
}

module.exports = { runIngestionJob };
