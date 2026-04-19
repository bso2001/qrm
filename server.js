const express = require('express');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const app = express();
const port = 3000;

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/generate', async (req, res) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qrm-api-'));
    try {
        const song = req.body;
        const inputJsonPath = path.join(tempDir, 'input.json');
        
        song.outputDir = tempDir;
        fs.writeFileSync(inputJsonPath, JSON.stringify(song));
        
        const qrmMainPath = path.join(__dirname, 'main.js');
        
        console.log(`[QRM API] Generating: ${song.name || 'untitled'}`);
        
        execSync(`node ${qrmMainPath} ${inputJsonPath}`, { cwd: __dirname });

        const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.mid'));
        if (files.length === 0) throw new Error('No MIDI files were generated');

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${song.name || 'song'}.zip"`);
        
        archive.pipe(res);
        for (const file of files) {
            archive.file(path.join(tempDir, file), { name: file });
        }
        await archive.finalize();

    } catch (err) {
        console.error('[QRM API] Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        setTimeout(() => {
            try {
                if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {}
        }, 10000);
    }
});

app.listen(port, () => {
    console.log(`QRM API running on http://localhost:${port}`);
});
