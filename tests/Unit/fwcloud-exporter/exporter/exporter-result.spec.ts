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

import { describeName, expect } from "../../../mocha/global-setup";
import { ExporterResult } from "../../../../src/fwcloud-exporter/exporter/exporter-result";
import { FwCloud } from "../../../../src/models/fwcloud/FwCloud";

describe(describeName('ExporterResult tests'), () => {
    it('getTableWithEntities() should return all table names with entities which has been exported', () => {
        const exportResult = new ExporterResult();
        exportResult.addTableData("table1", "FwCloud", []);
        exportResult.addTableData("table2", "Firewall", []);
        exportResult.addTableData("table3", null, []);

        expect(exportResult.getTableWithEntities()).to.be.deep.eq([
            {
                entityName: "FwCloud",
                tableName: "table1"
            }, {
                entityName: "Firewall",
                tableName: "table2"
            }, {
                entityName: null,
                tableName: "table3"
            }
        ]);
    })
})