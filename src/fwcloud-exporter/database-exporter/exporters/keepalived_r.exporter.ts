/*!
    Copyright 2024 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
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
import { TableExporter } from './table-exporter';
import Model from '../../../models/Model';
import { KeepalivedRule } from '../../../models/system/keepalived/keepalived_r/keepalived_r.model';
import { SelectQueryBuilder } from 'typeorm';
import { KeepalivedGroup } from '../../../models/system/keepalived/keepalived_g/keepalived_g.model';
import { Firewall } from '../../../models/firewall/Firewall';
import { FirewallExporter } from './firewall.exporter';
import { KeepalivedGroupExporter } from './keepalived_g.exporter';

export class KeepalivedRuleExporter extends TableExporter {
  protected getEntity(): typeof Model {
    return KeepalivedRule;
  }

  public getFilterBuilder(
    qb: SelectQueryBuilder<any>,
    alias: string,
    fwCloudId: number,
  ): SelectQueryBuilder<any> {
    return qb
      .where((qb) => {
        const query = qb.subQuery().from(KeepalivedGroup, 'keepalived_g').select('keepalived_g.id');

        return (
          `${alias}.keepalivedGroupId IN ` +
          new KeepalivedGroupExporter()
            .getFilterBuilder(query, 'keepalived_g', fwCloudId)
            .getQuery()
        );
      })
      .where((qb) => {
        const query = qb.subQuery().from(Firewall, 'firewall').select('firewall.id');
        return (
          `${alias}.firewallId IN ` +
          new FirewallExporter().getFilterBuilder(query, 'firewall', fwCloudId).getQuery()
        );
      });
  }
}
