import { Backup } from "../../../src/backups/backup";
import * as fs from "fs";
import * as path from "path";
import { DatabaseService } from "../../../src/database/database.service";
import { expect, testSuite, describeName } from "../../mocha/global-setup";
import { BackupService } from "../../../src/backups/backup.service";
import { Application } from "../../../src/Application";

let app: Application;
let service: BackupService;

beforeEach(async() => {
    app = testSuite.app;
    service = await app.getService<BackupService>(BackupService.name);
})

describe(describeName('Backup tests'), () => {
    it('exists should return false if the backup is not persisted', async () => {
        const backup: Backup = new Backup();
        expect(backup.exists()).to.be.false;
    });

    it('create() should create a backup directory', async () => {
        let backup: Backup = new Backup();
        await backup.create(service.config.data_dir);
        expect(backup.exists()).to.be.true;
        expect(backup.id).not.to.be.null;
        expect(fs.existsSync(backup.path)).to.be.true;
    });

    it('create() should create a dump file', async() => {
        let backup: Backup = new Backup();
        backup = await backup.create(service.config.data_dir);
        expect(fs.existsSync(path.join(backup.path, Backup.DUMP_FILENAME))).to.be.true;
    });

    it('create() should copy data files if exists', async () => {
        //TODO
    });

    it('create() should generate a backup.json file with metadata', async () => {
        let backup: Backup = new Backup();
        backup.setComment('test comment');
        backup = await backup.create(service.config.data_dir);
        
        expect(fs.existsSync(path.join(backup.path, Backup.METADATA_FILENAME))).to.be.true;

        const metadata: object = JSON.parse(fs.readFileSync(path.join(backup.path, Backup.METADATA_FILENAME)).toString());

        expect(metadata).to.be.deep.equal({
            name: backup.name,
            timestamp: backup.timestamp,
            version: app.version.tag,
            comment: 'test comment',
        });
    });

    it('load() should load the metadata file', async() => {
        let backup: Backup = new Backup();
        backup.setComment('test comment');
        backup = await backup.create(service.config.data_dir);

        const b2: Backup = await new Backup().load(backup.path);

        expect(b2.name).to.be.deep.equal(backup.name);
        expect(b2.timestamp).to.be.deep.equal(backup.timestamp);
        expect(b2.version).to.be.deep.equal(backup.version);
        expect(b2.comment).to.be.deep.equal(backup.comment);
    })

    it('restore() should import the database', async() => {
        const databaseService: DatabaseService = await app.getService<DatabaseService>(DatabaseService.name);
        let backup: Backup = new Backup();
        backup = await backup.create(service.config.data_dir);

        await databaseService.emptyDatabase();

        backup = await backup.restore();

        expect(await databaseService.connection.createQueryRunner().hasTable('ca')).to.be.true;

        await databaseService.emptyDatabase();
    });

    it('delete() should remove the backup', async() => {
        let backup: Backup = new Backup();
        backup = await backup.create(service.config.data_dir);

        backup = await backup.destroy();

        expect(fs.existsSync(backup.path)).to.be.false;
    });

    it('load() an absolute path should transform the path to relative', async() => {
        let backup: Backup = new Backup();
        backup = await backup.create(path.join(process.cwd(), service.config.data_dir));

        expect(backup.path.startsWith(service.config.data_dir)).to.be.true;
    });

    it('toResponse() should return all required properties', async() => {
        let backup: Backup = new Backup();
        backup = await backup.create(service.config.data_dir);

        expect(backup.toResponse()).to.be.deep.eq({
            id: backup.id,
            name: backup.name,
            date: backup.date.utc(),
            comment: backup.comment,
            version: backup.version
        })
    })
});