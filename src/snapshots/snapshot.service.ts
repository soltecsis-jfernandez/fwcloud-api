import { Service } from "../fonaments/services/service";
import { Snapshot } from "./snapshot";
import * as fs from "fs";
import * as path from "path";
import { NotFoundException } from "../fonaments/exceptions/not-found-exception";
import { FwCloud } from "../models/fwcloud/FwCloud";
import { Progress } from "../fonaments/http/progress/progress";

export type SnapshotConfig = {
    data_dir: string
};

export class SnapshotService extends Service {
    protected _config: SnapshotConfig;

    public async build(): Promise<SnapshotService> {
        this._config = this._app.config.get('snapshot');

        if (!fs.existsSync(this._config.data_dir)) {
            fs.mkdirSync(this._config.data_dir);
        }

        return this;
    }

    get config(): SnapshotConfig {
        return this._config;
    }

    public async getAll(): Promise<Array<Snapshot>> {
        const snapshots: Array<Snapshot> = [];

        const entires: Array<string> = fs.readdirSync(this._config.data_dir);
        for (let entry of entires.reverse()) {
            let snapshotPath: string = path.join(this._config.data_dir, entry);

            if (fs.statSync(snapshotPath).isDirectory()) {
                try {
                    snapshots.push(await Snapshot.load(snapshotPath));
                } catch(e) {}
            }
        }

        return snapshots;
    }
    
    public async findOne(id: number): Promise<Snapshot> {
        let snapshots: Array<Snapshot> = await this.getAll();

        const results = snapshots.filter((snapshot: Snapshot) => {
            return snapshot.id === id;
        });

        return results.length > 0 ? results[0] : null;
    }

    public async findOneOrFail(id: number): Promise<Snapshot> {
        let snapshot: Snapshot = await this.findOne(id);

        if (!snapshot) {
            throw new NotFoundException();
        }

        return snapshot;
    }

    public async store(name: string, comment: string, fwcloud: FwCloud): Promise<Progress<Snapshot>> {
        return await Snapshot.progressCreate(this.config.data_dir, fwcloud, name, comment)
    }

    public async update(snapshot: Snapshot, newData: {name: string, comment: string}): Promise<Snapshot> {
        return await snapshot.update(newData);
    }

    public restore(snapshot: Snapshot): Progress<Snapshot> {
        return snapshot.progressRestore();
    }

    public async destroy(snapshot: Snapshot): Promise<Snapshot> {
        return await snapshot.destroy();
    }
}