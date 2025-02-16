/*
    Copyright 2021 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
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

import Model from '../Model';
import { OpenVPN } from '../../models/vpn/openvpn/OpenVPN';
import { PolicyRule } from '../../models/policy/PolicyRule';
import { Tree } from '../tree/Tree';
import { PrimaryColumn, Column } from 'typeorm';
import Query from '../../database/Query';
import { ProgressNoticePayload } from '../../sockets/messages/socket-message';
import { EventEmitter } from 'typeorm/platform/PlatformTools';
const fwcError = require('../../utils/error_table');

let dbCon;
let fwcloud;

const tableName: string = 'fwc_tree';

export class Repair extends Model {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  id_parent: number;

  @Column()
  node_order: number;

  @Column()
  node_type: number;

  @Column()
  id_obj: number;

  @Column()
  obj_type: number;

  @Column()
  fwcloud: number;

  public getTableName(): string {
    return tableName;
  }

  public static initData(req): Promise<void> {
    return new Promise(async (resolve) => {
      dbCon = req.dbCon;
      fwcloud = req.body.fwcloud;
      resolve();
    });
  }

  //Ontain all root nodes.
  public static checkRootNodes(dbCon: Query, channel: EventEmitter = new EventEmitter()) {
    return new Promise((resolve, reject) => {
      let sql =
        'SELECT id,name,node_type,id_obj,obj_type FROM ' +
        tableName +
        ' WHERE fwcloud=' +
        dbCon.escape(fwcloud) +
        ' AND id_parent is null';
      dbCon.query(sql, async (error, nodes) => {
        if (error) return reject(error);

        // The nodes must have the names: FIREWALLS, OBJECTS and SERVICES; with
        // the respective node types FDF, FDO, FDS.
        let update_obj_to_null = 0;
        let firewalls_found = 0;
        let objects_found = 0;
        let services_found = 0;
        let ca_found = 0;
        for (const node of nodes) {
          if (node.name === 'FIREWALLS' && node.node_type === 'FDF') {
            channel.emit('message', new ProgressNoticePayload(`Root node found: ${node.id} \n`));
            firewalls_found = 1;
          } else if (node.name === 'OBJECTS' && node.node_type === 'FDO') {
            channel.emit('message', new ProgressNoticePayload(`Root node found: ${node.id} \n`));
            objects_found = 1;
          } else if (node.name === 'SERVICES' && node.node_type === 'FDS') {
            channel.emit('message', new ProgressNoticePayload(`Root node found: ${node.id} \n`));
            services_found = 1;
          } else if (node.name === 'CA' && node.node_type === 'FCA') {
            channel.emit('message', new ProgressNoticePayload(`Root node found: ${node.id} \n`));
            ca_found = 1;
          } else {
            channel.emit(
              'message',
              new ProgressNoticePayload(`Deleting invalid root node: ${node.id}\n`),
            );
            await Tree.deleteFwc_TreeFullNode({
              id: node.id,
              fwcloud: fwcloud,
            });
          }

          if (node.id_obj != null || node.obj_type != null) {
            node.id_obj = node.obj_type = null;
            update_obj_to_null = 1;
          }
        }

        // Verify that we have found all nodes.
        if (!firewalls_found || !objects_found || !services_found || !ca_found)
          return reject(fwcError.other('Not found all root nodes'));

        // The properties id_obj and obj_type must be null. If not we can repair it.
        if (update_obj_to_null) {
          channel.emit(
            'message',
            new ProgressNoticePayload(
              `Repairing root nodes (setting id_obj and obj_type to null).\n`,
            ),
          );
          sql =
            'update ' +
            tableName +
            ' set id_obj=NULL,obj_type=NULL' +
            ' WHERE fwcloud=' +
            dbCon.escape(fwcloud) +
            ' AND id_parent is null';
          dbCon.query(sql, (error, result) => {
            if (error) return reject(error);
            resolve(nodes);
          });
        } else resolve(nodes);
      });
    });
  }

  // Resolve with the parent id of a tree node.
  public static getParentId(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id_parent FROM ' + tableName + ' WHERE id=' + id;
      dbCon.query(sql, (error, nodes) => {
        if (error) return reject(error);
        if (nodes.length !== 1) return resolve(-1);
        resolve(nodes[0].id_parent);
      });
    });
  }

  // Verify all not root nodes.
  public static checkNotRootNodes(
    rootNodes,
    channel: EventEmitter = new EventEmitter(),
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql =
        'SELECT id,id_parent,name,node_type,id_obj,obj_type FROM ' +
        tableName +
        ' WHERE fwcloud=' +
        fwcloud +
        ' AND id_parent is not null';
      dbCon.query(sql, async (error, nodes) => {
        if (error) return reject(error);

        try {
          let last_id_ancestor, id_ancestor, deep, root_node_found;
          for (const node of nodes) {
            id_ancestor = node.id;
            deep = 0;
            do {
              last_id_ancestor = id_ancestor;
              id_ancestor = await this.getParentId(id_ancestor);

              // We are in a tree and then we can not have loops.
              // For security we allo a maximum deep of 100.
              if (id_ancestor === -1 || id_ancestor === node.id || ++deep > 100) {
                if (id_ancestor === -1) {
                  channel.emit(
                    'message',
                    new ProgressNoticePayload(`Ancestor not found, deleting node: ${node.id}\n`),
                  );
                } else if (id_ancestor === node.id) {
                  channel.emit(
                    'message',
                    new ProgressNoticePayload(`Deleting node in a loop: ${node.id}\n`),
                  );
                } else if (deep > 100) {
                  channel.emit(
                    'message',
                    new ProgressNoticePayload(`Deleting a too much deep node: ${node.id}\n`),
                  );
                }

                await Tree.deleteFwc_TreeFullNode({
                  id: node.id,
                  fwcloud: fwcloud,
                });
                break;
              }
            } while (id_ancestor);

            // Verify that the last ancestor id is the one of one of the root nodes.
            root_node_found = 0;
            for (const rootNode of rootNodes) {
              if (last_id_ancestor === rootNode.id) {
                root_node_found = 1;
                break;
              }
            }
            if (!root_node_found) {
              channel.emit(
                'message',
                new ProgressNoticePayload(
                  `Root node for this node is not correct. Deleting node: ${node.id}\n'`,
                ),
              );
              await Tree.deleteFwc_TreeFullNode({
                id: node.id,
                fwcloud: fwcloud,
              });
              continue;
            }
          }
        } catch (error) {
          reject(error);
        }

        resolve();
      });
    });
  }

  // Regenerate firewalls tree.
  public static regenerateFirewallTree(
    rootNode,
    firewall,
    channel: EventEmitter = new EventEmitter(),
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql =
        'SELECT T1.id,T1.id_parent,T2.node_type as parent_node_type FROM fwc_tree T1' +
        ' INNER JOIN fwc_tree T2 on T2.id=T1.id_parent ' +
        ' WHERE T1.fwcloud=' +
        fwcloud +
        ' AND T1.id_obj=' +
        firewall.id +
        ' AND T1.node_type="FW"';
      dbCon.query(sql, async (error, nodes) => {
        if (error) return reject(error);

        try {
          let nodeId = rootNode.id;

          if (nodes.length === 0) {
            // No node found for this firewall.
            channel.emit(
              'message',
              new ProgressNoticePayload(
                `No node found for firewall: ${JSON.stringify(firewall)}\n`,
              ),
            );
          } else {
            if (nodes.length === 1) {
              // The common case, firewall referenced by only one node three.
              if (nodes[0].parent_node_type === 'FDF' || nodes[0].parent_node_type === 'FD') {
                nodeId = nodes[0].id_parent;
              }
            } else if (nodes.length !== 1) {
              channel.emit(
                'message',
                new ProgressNoticePayload(
                  `Found several nodes for firewall: ${JSON.stringify(firewall)}\n`,
                ),
              );
            }
            // Remove nodes for this firewall.
            for (const node of nodes) {
              await Tree.deleteFwc_TreeFullNode({
                id: node.id,
                fwcloud: fwcloud,
              });
            }
          }

          // Regenerate the tree.
          channel.emit(
            'message',
            new ProgressNoticePayload(`Regenerating tree for firewall: ${firewall.id} \n`),
          );
          await Tree.insertFwc_Tree_New_firewall(fwcloud, nodeId, firewall.id);
        } catch (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  // Check that all firewalls appear in the tree.
  public static checkFirewallsInTree(
    rootNode,
    channel: EventEmitter = new EventEmitter(),
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql =
        'SELECT id,name,options FROM firewall WHERE cluster is null AND fwcloud=' +
        dbCon.escape(fwcloud);
      dbCon.query(sql, async (error, firewalls) => {
        if (error) return reject(error);
        try {
          for (const firewall of firewalls) {
            await this.regenerateFirewallTree(rootNode, firewall, channel);
            await PolicyRule.checkSpecialRules(dbCon, firewall.id, firewall.options);
          }

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  // Regenerate cluster tree.
  public static regenerateClusterTree(
    rootNode,
    cluster,
    channel: EventEmitter = new EventEmitter(),
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql =
        'SELECT T1.id,T1.id_parent,T2.node_type as parent_node_type FROM fwc_tree T1' +
        ' INNER JOIN fwc_tree T2 on T2.id=T1.id_parent ' +
        ' WHERE T1.fwcloud=' +
        dbCon.escape(fwcloud) +
        ' AND T1.id_obj=' +
        dbCon.escape(cluster.id) +
        ' AND T1.node_type="CL"';
      dbCon.query(sql, async (error, nodes) => {
        if (error) return reject(error);

        try {
          let nodeId = rootNode.id;

          if (nodes.length === 0) {
            // No node found for this cluster.
            channel.emit(
              'message',
              new ProgressNoticePayload(`No node found for cluster: ${JSON.stringify(cluster)}\n`),
            );
          } else {
            if (nodes.length === 1) {
              // The common case, cluster referenced by only one node three.
              if (nodes[0].parent_node_type === 'FDF' || nodes[0].parent_node_type === 'FD') {
                nodeId = nodes[0].id_parent;
              }
            } else if (nodes.length !== 1) {
              channel.emit(
                'message',
                new ProgressNoticePayload(
                  `Found several nodes for cluster: ${JSON.stringify(cluster)}\n`,
                ),
              );
            }

            // Remove nodes for this cluster.
            for (const node of nodes) {
              await Tree.deleteFwc_TreeFullNode({
                id: node.id,
                fwcloud: fwcloud,
              });
            }
          }
          // Regenerate the tree.
          channel.emit(
            'message',
            new ProgressNoticePayload(`Regenerating tree for cluster: ${cluster.id} \n`),
          );
          await Tree.insertFwc_Tree_New_cluster(fwcloud, nodeId, cluster.id);
        } catch (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  // Check that all clusters appear in the tree.
  public static checkClustersInTree(
    rootNode,
    channel: EventEmitter = new EventEmitter(),
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql =
        'SELECT C.id,C.name,F.id as fwmaster_id,F.options FROM cluster C ' +
        ' INNER JOIN firewall F on F.cluster=C.id ' +
        ' WHERE C.fwcloud=' +
        dbCon.escape(fwcloud) +
        ' AND F.fwmaster=1';
      dbCon.query(sql, async (error, clusters) => {
        if (error) return reject(error);
        try {
          for (const cluster of clusters) {
            await this.regenerateClusterTree(rootNode, cluster, channel);
            await PolicyRule.checkSpecialRules(dbCon, cluster.fwmaster_id, cluster.options);
          }

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  // Verify that the nodes into de folders are valid.
  public static checkNode(node, channel: EventEmitter = new EventEmitter()) {
    return new Promise(async (resolve, reject) => {
      try {
        let sql = '';
        if (node.node_type === 'FW') {
          if (node.obj_type !== 0) {
            // Verify that object type is correct.
            channel.emit(
              'message',
              new ProgressNoticePayload(
                `Deleting node with bad obj_type: ${JSON.stringify(node)}\n`,
              ),
            );
            await Tree.deleteFwc_TreeFullNode({
              id: node.id,
              fwcloud: fwcloud,
            });
            return resolve(false);
          }
          sql =
            'SELECT id FROM firewall WHERE fwcloud=' +
            dbCon.escape(fwcloud) +
            ' AND id=' +
            dbCon.escape(node.id_obj) +
            ' AND cluster is null';
        } else if (node.node_type === 'CL') {
          if (node.obj_type !== 100) {
            // Verify that object type is correct.
            channel.emit(
              'message',
              new ProgressNoticePayload(
                `Deleting node with bad obj_type: ${JSON.stringify(node)}\n`,
              ),
            );
            await Tree.deleteFwc_TreeFullNode({
              id: node.id,
              fwcloud: fwcloud,
            });
            return resolve(false);
          }
          sql =
            'SELECT id FROM cluster WHERE fwcloud=' +
            dbCon.escape(fwcloud) +
            ' AND id=' +
            dbCon.escape(node.id_obj);
        } else return resolve(true);

        // Check that referenced object exists.
        dbCon.query(sql, async (error, rows) => {
          if (error) return reject(error);

          if (rows.length !== 1) {
            channel.emit(
              'message',
              new ProgressNoticePayload(
                `Referenced object not found. Deleting node: ${JSON.stringify(node)}\n`,
              ),
            );
            await Tree.deleteFwc_TreeFullNode({
              id: node.id,
              fwcloud: fwcloud,
            });
            resolve(false);
          } else resolve(true);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Verify that the nodes into de folders are valid.
  public static checkFirewallsFoldersContent(
    rootNode,
    channel: EventEmitter = new EventEmitter(),
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql =
        'SELECT id,node_type,id_obj,obj_type FROM ' +
        tableName +
        ' WHERE fwcloud=' +
        dbCon.escape(fwcloud) +
        ' AND id_parent=' +
        dbCon.escape(rootNode.id);
      dbCon.query(sql, async (error, nodes) => {
        if (error) return reject(error);

        try {
          for (const node of nodes) {
            // Into a folder we can have only more folders, firewalls or clusters.
            if (node.node_type !== 'FD' && node.node_type !== 'FW' && node.node_type !== 'CL') {
              channel.emit(
                'message',
                new ProgressNoticePayload(
                  `This node type can not be into a folder. Deleting it: ${JSON.stringify(node)}\n`,
                ),
              );
              await Tree.deleteFwc_TreeFullNode({
                id: node.id,
                fwcloud: fwcloud,
              });
            }

            // Check that the firewall or cluster pointed by the node exists.
            if (node.node_type === 'FW' || node.node_type === 'CL')
              await this.checkNode(node, channel);
            else {
              // Recursively check the folders nodes.
              channel.emit(
                'message',
                new ProgressNoticePayload(`Checking folder node: ${JSON.stringify(node)} \n`),
              );
              await this.checkFirewallsFoldersContent(node, channel);
            }
          }
        } catch (error) {
          reject(error);
        }
        resolve();
      });
    });
  }

  // Regenerate host tree.
  public static regenerateHostTree(hostsNode, host): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const newId = await Tree.newNode(
          dbCon,
          fwcloud,
          host.name,
          hostsNode.id,
          'OIH',
          host.id,
          8,
        );
        await Tree.interfacesTree(dbCon, fwcloud, newId, host.id, 'HOST');
      } catch (error) {
        reject(error);
      }
      resolve();
    });
  }

  // Verify that the host objects are correct.
  public static checkHostObjects(rootNode): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verify that we have only one Hosts node.
      let sql =
        'SELECT id FROM ' +
        tableName +
        ' WHERE fwcloud=' +
        dbCon.escape(fwcloud) +
        ' AND id_parent=' +
        dbCon.escape(rootNode.id) +
        ' AND node_type="OIH" AND id_obj IS NULL and obj_type=8';
      dbCon.query(sql, (error, nodes) => {
        if (error) return reject(error);
        if (nodes.length !== 1) return reject(fwcError.other('Hosts node not found'));

        // Clear the hosts node removing all child nodes.
        sql =
          'SELECT id FROM ' +
          tableName +
          ' WHERE fwcloud=' +
          dbCon.escape(fwcloud) +
          ' AND id_parent=' +
          dbCon.escape(nodes[0].id);
        dbCon.query(sql, async (error, childs) => {
          if (error) return reject(error);
          try {
            for (const child of childs)
              await Tree.deleteFwc_TreeFullNode({
                id: child.id,
                fwcloud: fwcloud,
              });
          } catch (error) {
            return reject(error);
          }

          // Search for all the hosts in the selected cloud.
          sql =
            'SELECT id,name FROM ipobj' + ' WHERE fwcloud=' + dbCon.escape(fwcloud) + ' AND type=8';
          dbCon.query(sql, async (error, hosts) => {
            if (error) return reject(error);
            try {
              for (const host of hosts) await this.regenerateHostTree(nodes[0], host);
            } catch (error) {
              return reject(error);
            }
            resolve();
          });
        });
      });
    });
  }

  // Regenerate non standard IP objects for this cloud.
  public static checkNonStdIPObj(node_id, node_type, ipobj_type): Promise<void> {
    return new Promise((resolve, reject) => {
      let sql = '';
      if (ipobj_type === 30)
        // Iptables marks
        sql = `SELECT id,name FROM mark WHERE fwcloud=${fwcloud}`;
      else
        sql = `SELECT id,name FROM ipobj WHERE fwcloud=${fwcloud} AND type=${ipobj_type} AND interface is null`;
      dbCon.query(sql, async (error, ipobjs) => {
        if (error) return reject(error);

        try {
          for (const ipobj of ipobjs) {
            // Verify that the ipobj is not part of an OpenVPN configuration.
            if (ipobj_type === 5) {
              // ADDRESS
              if (await OpenVPN.searchIPObjInOpenvpnOpt(dbCon, ipobj.id, 'ifconfig-push')) continue;
            }
            // Include VPN LANs in objects tree.
            //else if (ipobj_type === 7) { // NETWORK
            //    if (await OpenVPN.searchIPObjInOpenvpnOpt(dbCon, ipobj.id, 'server'))
            //        continue;
            //}

            await Tree.newNode(
              dbCon,
              fwcloud,
              ipobj.name,
              node_id,
              node_type,
              ipobj.id,
              ipobj_type,
            );
          }
          resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  // Regenerate non standard IP objects groups for this cloud.
  public static checkNonStdIPObjGroup(node_id, node_type, group_type): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id,name,type FROM ipobj_g WHERE fwcloud=${fwcloud} AND type=${group_type}`;
      dbCon.query(sql, async (error, groups) => {
        if (error) return reject(error);

        try {
          let id;
          for (const group of groups) {
            id = await Tree.newNode(
              dbCon,
              fwcloud,
              group.name,
              node_id,
              node_type,
              group.id,
              group_type,
            );
            await Tree.createGroupNodes(dbCon, fwcloud, id, group.id);
          }
          resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  // Remove orphan nodes (nodes wich id_parent points to a non existing node with this id_parnet value).
  public static deleteOrphanNodes(channel: EventEmitter = new EventEmitter()): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql: string = `select id,fwcloud from ${tableName}
                where id_parent is not null and id_parent not in (select id from fwc_tree)`;
      dbCon.query(sql, async (error, result) => {
        if (error) return reject(error);

        // If wee have orphan nodes, remove them.
        if (result && result.length > 0) {
          channel.emit(
            'message',
            new ProgressNoticePayload(`Removing ${result.length} orphan nodes.\n`),
          );

          try {
            for (const node of result)
              await Tree.deleteFwc_TreeFullNode({
                id: node.id,
                fwcloud: node.fwcloud,
              });
          } catch (error) {
            return reject(error);
          }
        }

        resolve();
      });
    });
  }
}
