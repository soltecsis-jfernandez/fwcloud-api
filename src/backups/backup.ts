/*!
    Copyright 2019 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
    https://soltecsis.com
    info@soltecsis.com


    This file is part of FWCloud (https://fwcloud.net).

    FWCloud is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    FWCloud is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with FWCloud.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as path from "path";
import * as fs from "fs";
import * as fse from "fs-extra"
import { app } from "../fonaments/abstract-application";
import { DatabaseService, DatabaseConfig } from "../database/database.service";
import moment, { Moment } from "moment";

import mysqldump from "mysqldump";
import { BackupNotFoundException } from "./exceptions/backup-not-found-exception";
import { Responsable } from "../fonaments/contracts/responsable";
import { RestoreBackupException } from "./exceptions/restore-backup-exception";
import StringHelper from "../utils/StringHelper";
import { timingSafeEqual } from "crypto";
import { stringify } from "querystring";
const mysql_import = require('mysql-import');

export interface BackupMetadata {
    name: string,
    timestamp: number;
    version: string;
    comment: string;
}
export class Backup implements Responsable {
    static DUMP_FILENAME: string = 'db.sql';
    static METADATA_FILENAME: string = 'backup.json';

    protected _id: number;
    protected _name: string;
    protected _date: Moment;
    protected _exists: boolean;
    protected _backupPath: string;
    protected _dumpFilename: string;
    protected _comment: string;

    constructor() {
        this._id = null;
        this._name = null;
        this._date = null;
        this._exists = false;
        this._backupPath = null;
        this._dumpFilename = null;
        this._comment = null;
    }

    toResponse(): Object {
        return {
            id: this._id,
            name: this._name,
            date: this._date.utc(),
            comment: this._comment
        }
    }

    /**
     * Returns the backup date
     */
    get date(): Moment {
        return this._date;
    }

    get timestamp(): number {
        return this._date.valueOf();
    }

    get name(): string {
        return this._name;
    }

    /**
     * Returns the backup id (formated date)
     */
    get id(): number {
        return this._id;
    }

    /**
     * Returns the backup path
     */
    get path(): string {
        return this._backupPath;
    }

    public setComment(comment: string) {
        this._comment = comment; 
    }

    /**
     * Returns the whether the backup
     */
    public exists(): boolean {
        return this._exists;
    }

    /**
     * Loads a backup from a filesystem path
     * 
     * @param backupPath Backup path
     */
    async load(backupPath: string): Promise<Backup> {
        const dbConfig: DatabaseConfig = (await app().getService<DatabaseService>(DatabaseService.name)).config;

        if (fs.statSync(backupPath).isDirectory() && fs.statSync) {
            const metadata: BackupMetadata = this.loadMetadataFromDirectory(backupPath);
            this._date = moment(metadata.timestamp);
            this._id = metadata.timestamp;
            this._name = metadata.name;
            this._exists = true;
            this._backupPath = path.isAbsolute(backupPath) ? StringHelper.after(path.join(app().path, "/"), backupPath): backupPath;
            this._dumpFilename = Backup.DUMP_FILENAME
            return this;
        }

        throw new BackupNotFoundException(backupPath);
    }

    protected loadMetadataFromDirectory(directory: string): BackupMetadata {
        const metadataPath: string = path.join(directory, Backup.METADATA_FILENAME);

        if (fs.statSync(metadataPath).isFile()) {
            return <BackupMetadata>JSON.parse(fs.readFileSync(metadataPath).toString());
        }

        throw new BackupNotFoundException(metadataPath);
    }

    /**
     * Creates a backup into the path
     * 
     * @param backupDirectory Backup path
     */
    async create(backupDirectory: string): Promise<Backup> {
        this._date = moment();
        this._name = this._date.format('YYYY-MM-DD HH:MM:ss');
        this._backupPath = path.join(backupDirectory, this.timestamp.toString());

        this.createDirectory();
        this.exportMetadataFile();
        await this.exportDatabase();
        await this.exportDataDirectories();

        await this.load(this._backupPath);
        return this;
    }

    /**
     * Restores an existing backup
     */
    async restore(): Promise<Backup> {
        if (this._exists) {

            try {
                await this.importDatabase();

                await this.importDataDirectories();

                //TODO: Make all firewalls pending of compile and install.

                //TODO: Make all VPNs pending of install.

                //TODO: Clean all policy compilation cache.
                return this;
            } catch (e) {
                console.error(e);
                throw e;
            }
        }

        throw new BackupNotFoundException(this._backupPath);
    }

    /**
     * Destroys an existing backup
     */
    async destroy(): Promise<Backup> {
        if (this._exists) {
            fse.removeSync(this._backupPath);
            this._exists = false;
        }

        return this;
    }

    /**
     * Creates the backup directory
     */
    protected createDirectory(): void {
        if (fs.existsSync(this._backupPath)) {
            fse.removeSync(this._backupPath);
        }

        fs.mkdirSync(this._backupPath);
    }

    protected exportMetadataFile(): void {
        const metadata: BackupMetadata = {
            name: this._name,
            timestamp: this._date.valueOf(),
            version: '0.0.0',
            comment: this._comment
        };

        fs.writeFileSync(path.join(this._backupPath, Backup.METADATA_FILENAME), JSON.stringify(metadata, null, 2))
    }

    /**
     * Exports the database into a file
     */
    protected async exportDatabase(): Promise<void> {
        const databaseService: DatabaseService = await app().getService<DatabaseService>(DatabaseService.name);
        const dbConfig: DatabaseConfig = databaseService.config;

        try {
            await mysqldump({
                connection: {
                    host: dbConfig.host,
                    port: dbConfig.port,
                    user: dbConfig.user,
                    password: dbConfig.pass,
                    database: dbConfig.name,
                },
                dumpToFile: path.join(this._backupPath, Backup.DUMP_FILENAME),
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Imports the database from a file
     */
    protected async importDatabase() {
        return new Promise(async (resolve, reject) => {
            const databaseService: DatabaseService = await app().getService<DatabaseService>(DatabaseService.name);
            const dbConfig: DatabaseConfig = databaseService.config;

            await databaseService.emptyDatabase();

            if (! await databaseService.isDatabaseEmpty()) {
                reject(new RestoreBackupException('Database can not be wiped'));
            }

            // Full database restore.
            const mydb_importer = mysql_import.config({
                host: dbConfig.host,
                user: dbConfig.user,
                port: dbConfig.port,
                password: dbConfig.pass,
                database: dbConfig.name,
                onerror: (err: Error) => {
                    reject(err);
                }
            });

            await mydb_importer.import(path.join(this._backupPath, Backup.DUMP_FILENAME));
            resolve();
        });
    }

    /**
     * Copy DATA directories from the backup
     */
    protected async exportDataDirectories(): Promise<void> {
        const config = app().config;

        let item_list: Array<string> = ['pki', 'policy'];

        for (let item of item_list) {
            const dst_dir = path.join(this._backupPath, config.get(item).data_dir);
            await fse.mkdirp(dst_dir);
            await fse.copy(config.get(item).data_dir, dst_dir);
        }
    }

    /**
     * Copy DATA directories into the backup
     */
    protected async importDataDirectories(): Promise<void> {
        const config = app().config;

        let item_list: Array<string> = ['pki', 'policy'];


        for (let item of item_list) {
            const src_dir: string = path.join(this._backupPath, config.get(item).data_dir);
            const dst_dir: string = config.get(item).data_dir;

            fse.removeSync(dst_dir);
            await fse.mkdirp(dst_dir);
            await fse.copy(src_dir, dst_dir);
        }
    }
}