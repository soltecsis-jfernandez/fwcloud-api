#!/usr/bin/env node
/*
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


import * as yargs from "yargs";
import { MigrationResetCommand } from "./commands/MigrationResetCommand";
import { MigrationRunCommand } from "./commands/MigrationRunCommand";
import { InstallCommand } from "./commands/InstallCommand";
import { MigrationCreateCommand } from "./commands/MigrationCreateCommand";
import { MigrationRevertCommand } from "./commands/MigrationRevertCommand";

yargs
    .usage("Usage: $0 <command> [options]")
    .command(new MigrationResetCommand())
    .command(new InstallCommand())
    .command(new MigrationRunCommand())
    .command(new MigrationCreateCommand())
    .command(new MigrationRevertCommand())
    .recommendCommands()
    .demandCommand(1)
    .strict()
    .alias("v", "version")
    .help("h")
    .alias("h", "help")
    .argv;