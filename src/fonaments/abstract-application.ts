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

import 'reflect-metadata';
import * as fs from 'fs';
import { ServiceContainer } from './services/service-container';
import { ServiceProvider } from './services/service-provider';
import { Service } from './services/service';
import * as path from 'path';
import { Version } from '../version/version';
import { FSHelper } from '../utils/fs-helper';
import { DatabaseService } from '../database/database.service';
import { LogServiceProvider } from '../logs/log.provider';
import { LoggerType, LogService } from '../logs/log.service';
import winston from 'winston';

let _runningApplication: AbstractApplication = null;

export function logger(type: LoggerType = 'default'): winston.Logger {
  if (app()) {
    return app().logger(type);
  }

  return null;
}

export function app<T extends AbstractApplication>(): T {
  return <T>_runningApplication;
}

export abstract class AbstractApplication {
  protected _config: any;
  protected _path: string;
  protected _services: ServiceContainer;
  protected _version: Version;
  protected _logService: LogService;

  protected constructor(path: string = process.cwd()) {
    try {
      this._path = path;
      this._config = require('../config/config');
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      _runningApplication = this;
    } catch (e) {
      console.error('Aplication startup failed: ' + e.message);
      process.exit(e);
    }
  }

  get config(): any {
    return this._config;
  }

  get path(): string {
    return this._path;
  }

  get version(): Version {
    return this._version;
  }

  logger(type: LoggerType = 'default'): winston.Logger {
    return this._logService.getLogger(type);
  }

  public async getService<T extends Service>(name: string): Promise<T> {
    return this._services.get(name);
  }

  public async bootstrap(): Promise<AbstractApplication> {
    this.generateDirectories();
    this.startServiceContainer();
    this.registerProviders();
    await this.bootsrapServices();

    this._logService = await this.getService<LogService>(LogService.name);

    this._version = await this.loadVersion();

    return this;
  }

  public async close() {
    await this.stopServiceContainer();
  }

  protected async loadVersion(): Promise<Version> {
    const version: Version = new Version();
    version.tag = JSON.parse(
      fs.readFileSync(path.join(this._path, 'package.json')).toString(),
    ).version;
    version.schema = await (
      await this.getService<DatabaseService>(DatabaseService.name)
    ).getSchemaVersion();

    return version;
  }

  protected registerProviders(): void {
    const providers: Array<any> = [LogServiceProvider].concat(this.providers());
    for (let i = 0; i < providers.length; i++) {
      const provider: ServiceProvider = new providers[i]();
      provider.register(this._services);
    }
  }

  protected async bootsrapServices(): Promise<void> {
    for (let i = 0; i < this.providers().length; i++) {
      const provider: ServiceProvider = new (this.providers()[i])();
      await provider.bootstrap(this);
    }
  }

  protected startServiceContainer() {
    this._services = new ServiceContainer(this);
  }

  protected async stopServiceContainer(): Promise<void> {
    await this._services.close();
  }

  /**
   * Returns an array of ServiceProviders classes to be bound
   */
  protected abstract providers(): Array<any>;

  /**
   * Creates autogenerated directories
   */
  public generateDirectories(): void {
    try {
      FSHelper.mkdirSync(this._config.get('policy').data_dir);
      FSHelper.mkdirSync(this._config.get('pki').data_dir);
      FSHelper.mkdirSync(this._config.get('session').files_path);
      FSHelper.mkdirSync(this._config.get('backup').data_dir);
      FSHelper.mkdirSync(this._config.get('snapshot').data_dir);
      FSHelper.mkdirSync(this._config.get('openvpn.history').data_dir);

      if (FSHelper.directoryExistsSync(this._config.get('tmp').directory)) {
        FSHelper.rmDirectorySync(this._config.get('tmp').directory);
      }
      FSHelper.mkdirSync(this._config.get('tmp').directory);
    } catch (e) {
      console.error('Could not create the logs directory. ERROR: ', e.message);
      process.exit(1);
    }
  }
}
