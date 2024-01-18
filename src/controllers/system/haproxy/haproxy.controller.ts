/*!
    Copyright 2023 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
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
import { Request } from 'express';
import { Controller } from '../../../fonaments/http/controller';
import { Validate, ValidateQuery } from "../../../decorators/validate.decorator";
import { HAProxyPolicy } from '../../../policies/haproxy.policy';
import { HAProxyRule } from '../../../models/system/haproxy/haproxy_r/haproxy_r.model';
import { ResponseBuilder } from '../../../fonaments/http/response-builder';
import { HAProxyGroup } from '../../../models/system/haproxy/haproxy_g/haproxy_g.model';
import { Firewall } from '../../../models/firewall/Firewall';
import { FwCloud } from "../../../models/fwcloud/FwCloud";
import { getRepository, SelectQueryBuilder } from 'typeorm';
import { HAProxyRuleService, HAProxyRulesData, ICreateHAProxyRule, IUpdateHAProxyRule } from '../../../models/system/haproxy/haproxy_r/haproxy_r.service';
import { HAProxyRuleCreateDto } from './dto/create.dto';
import { Offset } from '../../../offset';
import { HAProxyRuleCopyDto } from './dto/copy.dto';
import { HAProxyRuleUpdateDto } from './dto/update.dto';
import { HAProxyRuleBulkUpdateDto } from './dto/bulk-update.dto';
import { HttpException } from '../../../fonaments/exceptions/http/http-exception';
import { HAProxyRuleBulkRemoveDto } from './dto/bulk-remove.dto';
import { AvailableDestinations, HAProxyRuleItemForCompiler } from '../../../models/system/shared';


export class HAProxyController extends Controller {
  protected _haproxyRuleService: HAProxyRuleService;
  protected _haproxyrule: HAProxyRule;
  protected _haproxygroup: HAProxyGroup;
  protected _firewall: Firewall;
  protected _fwCloud: FwCloud;

  public async make(req: Request): Promise<void> {
    this._haproxyRuleService = await this._app.getService<HAProxyRuleService>(HAProxyRuleService.name);

    if (req.params.HAProxy) {
      this._haproxyrule = await getRepository(HAProxyRule).findOneOrFail(req.params.HAProxy);
    }
    if (req.params.HAProxygroup) {
      this._haproxygroup = await getRepository(HAProxyGroup).findOneOrFail(this._haproxyrule.group.id);
    }
    this._firewall = await getRepository(Firewall).findOneOrFail(req.params.firewall);
    this._fwCloud = await getRepository(FwCloud).findOneOrFail(req.params.fwcloud);
  }


  @Validate()
  /**
   * Retrieves a list of HAProxy configurations.
   * 
   * @param req - The request object.
   * @param res - The response object.
   * @returns A Promise that resolves to a ResponseBuilder object.
   */
  public async index(req: Request): Promise<ResponseBuilder> {
    (await HAProxyPolicy.index(this._firewall, req.session.user)).authorize();

    const HAProxyG: HAProxyRule[] = await this._haproxyRuleService.getHAProxyRulesData('compiler', this._fwCloud.id, this._firewall.id);

    return ResponseBuilder.buildResponse().status(200).body(HAProxyG);
  }

  @Validate()
  /**
   * Retrieves the grid data for HAProxy.
   * 
   * @param req - The request object.
   * @returns A Promise that resolves to a ResponseBuilder object.
   */
  public async grid(req: Request): Promise<ResponseBuilder> {
    if(![1,2].includes(parseInt(req.params.set))){
      return ResponseBuilder.buildResponse().status(400).body({message: 'Invalid set parameter'});
    }

    (await HAProxyPolicy.index(this._firewall, req.session.user)).authorize();

    const dst: AvailableDestinations = parseInt(req.params.set) === 1 ? 'regular_grid' : 'fixed_grid';

    const grid: HAProxyRule[] = await this._haproxyRuleService.getHAProxyRulesData(dst, this._fwCloud.id, this._firewall.id);

    return ResponseBuilder.buildResponse().status(200).body(grid);
  }

  //TODO: Offset is necessary we can create a rule in other position
  @Validate(HAProxyRuleCreateDto)
  public async create(req: Request): Promise<ResponseBuilder> {
    (await HAProxyPolicy.create(this._firewall, req.session.user)).authorize();

    const data: ICreateHAProxyRule = Object.assign(req.inputs.all<HAProxyRuleCreateDto>(), this._haproxygroup ? { group: this._haproxygroup.id } : null);
    const HAProxyRule = await this._haproxyRuleService.store(data);

    return ResponseBuilder.buildResponse().status(201).body(HAProxyRule);
  }

  @Validate(HAProxyRuleCopyDto)
  public async copy(req: Request): Promise<ResponseBuilder> {
    const ids: number[] = req.inputs.get('rules');
    for (const id of ids) {
      const rule = await getRepository(HAProxyRule).findOneOrFail(id);
      (await HAProxyPolicy.copy(rule, req.session.user)).authorize();
    }

    const created: HAProxyRule[] = await this._haproxyRuleService.copy(ids, req.inputs.get('to'), req.inputs.get<Offset>('offset'));
    return ResponseBuilder.buildResponse().status(201).body(created);
  }

  @Validate(HAProxyRuleUpdateDto)
  public async update(req: Request): Promise<ResponseBuilder> {
    (await HAProxyPolicy.update(this._haproxyrule, req.session.user)).authorize();

    const result: HAProxyRule = await this._haproxyRuleService.update(this._haproxyrule.id, req.inputs.all<IUpdateHAProxyRule>());

    return ResponseBuilder.buildResponse().status(200).body(result);
  }

  @Validate()
  public async remove(req: Request): Promise<ResponseBuilder> {
    (await HAProxyPolicy.delete(this._haproxyrule, req.session.user)).authorize();

    await this._haproxyRuleService.remove({
      fwcloudId: this._fwCloud.id,
      firewallId: this._firewall.id,
      id: parseInt(req.params.HAProxy),
    });

    return ResponseBuilder.buildResponse().status(200).body(this._haproxyrule);
  }

  @Validate()
  /**
   * Retrieves the HAProxy rule and returns it as a response.
   * 
   * @param req - The request object.
   * @returns A Promise that resolves to a ResponseBuilder object.
   */
  public async show(req: Request): Promise<ResponseBuilder> {
    (await HAProxyPolicy.show(this._haproxyrule, req.session.user)).authorize();

    return ResponseBuilder.buildResponse().status(200).body(this._haproxyrule);
  }

  @Validate(HAProxyRuleCopyDto)
  public async move(req: Request): Promise<ResponseBuilder> {
    (await HAProxyPolicy.move(this._firewall, req.session.user)).authorize();

    const rules: HAProxyRule[] = await getRepository(HAProxyRule).find({
      join: {
        alias: 'rule',
        innerJoin: {
          firewall: 'rule.firewall',
          fwcloud: 'firewall.fwCloud'
        }
      },
      where: (qb: SelectQueryBuilder<HAProxyRule>) => {
        qb.whereInIds(req.inputs.get('rules'))
          .andWhere('firewall.id = :firewall', { firewall: this._firewall.id })
          .andWhere('firewall.fwCloudId = :fwcloud', { fwcloud: this._fwCloud.id })
      }
    });

    const result: HAProxyRule[] = await this._haproxyRuleService.move(rules.map(item => item.id), req.inputs.get('to'), req.inputs.get<Offset>('offset'));

    return ResponseBuilder.buildResponse().status(200).body(result);
  }

  @Validate(HAProxyRuleBulkUpdateDto)
  public async bulkUpdate(req: Request): Promise<ResponseBuilder> {
    const rules: HAProxyRule[] = [];

    const ids: string[] = req.query.rules as string[] || [];

    for (let id of ids) {
      const rule: HAProxyRule = await this._haproxyRuleService.findOneInPath({
        fwcloudId: this._fwCloud.id,
        firewallId: this._firewall.id,
        id: parseInt(id),
      });

      (await HAProxyPolicy.update(rule, req.session.user)).authorize();

      rules.push(rule);
    }

    if (!rules.length) {
      throw new HttpException(`No rules found`, 400);
    }

    const result: HAProxyRule[] = await this._haproxyRuleService.bulkUpdate(rules.map(item => item.id), req.inputs.all<IUpdateHAProxyRule>());

    return ResponseBuilder.buildResponse().status(200).body(result);
  }

  @Validate()
  @ValidateQuery(HAProxyRuleBulkRemoveDto)
  public async bulkRemove(req: Request): Promise<ResponseBuilder> {
    const rules: HAProxyRule[] = [];

    const ids: number[] = req.query.rules as unknown as number[] || [];

    for (let id of ids) {
      const rule: HAProxyRule = await this._haproxyRuleService.findOneInPath({
        fwcloudId: this._fwCloud.id,
        firewallId: this._firewall.id,
        id,
      });

      (await HAProxyPolicy.delete(rule, req.session.user)).authorize();

      rules.push(rule);
    }

    if (!rules.length) {
      throw new HttpException(`No rules found to be removed`, 400);
    }

    const result: HAProxyRule[] = await this._haproxyRuleService.bulkRemove(rules.map(item => item.id));

    return ResponseBuilder.buildResponse().status(200).body(result);
  }
}
