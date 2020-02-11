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

import {MigrationInterface, QueryRunner, getConnection, AdvancedConsoleLogger} from "typeorm";
import * as fs from 'fs';

export class createDefaultData1579857224771 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`
            INSERT INTO customer VALUES (1,'SOLTECSIS, S.L.','C/Carrasca, 7 - 03590 Altea (Alicante) - Spain','+34 966 446 046','info@soltecsis.com','https://soltecsis.com','2019-05-06 10:22:12','2019-05-06 10:22:12',1,1)
        `);

        await queryRunner.query(`
            INSERT INTO fwc_tree_node_types VALUES 
                ('CA',NULL,'CA',NULL,2),
                ('CL',NULL,'Cluster',NULL,1),
                ('CRT',NULL,'Certificate',NULL,2),
                ('FCA',NULL,'Folder CA',NULL,2),
                ('FCF',NULL,'Folder Cluster Firewalls',NULL,2),
                ('FCR',NULL,'Folder CRT',NULL,2),
                ('FD',NULL,'Folder',NULL,1),
                ('FDC',NULL,'Folder Clusters',NULL,2),
                ('FDF',NULL,'Folder Firewalls',NULL,2),
                ('FDI',10,'Folder Interfaces',NULL,2),
                ('FDO',NULL,'Folder Objects',NULL,1),
                ('FDS',NULL,'Folder Services',NULL,1),
                ('FDT',NULL,'Folder Times',NULL,1),
                ('FP',NULL,'FILTER POLICIES',NULL,1),
                ('FP6',NULL,'FILTER POLICIES IPv6',NULL,1),
                ('FW',NULL,'Firewall',NULL,1),
                ('IFF',10,'Interfaces Firewalls',NULL,2),
                ('IFH',11,'Interfaces Host',NULL,2),
                ('MRK',30,'IPTables marks',NULL,2),
                ('ND6',NULL,'DNAT Rules IPv6',NULL,1),
                ('NS6',NULL,'SNAT Rules IPv6',NULL,1),
                ('NT',NULL,'NAT Rules',NULL,1),
                ('NTD',NULL,'DNAT Rules',NULL,1),
                ('NTS',NULL,'SNAT Rules',NULL,1),
                ('OCL',311,'OpenVPN Config CLI',NULL,2),
                ('OIA',5,'IP Address Objects',NULL,2),
                ('OIG',20,'Objects Groups',NULL,2),
                ('OIH',8,'IP Host Objects',NULL,2),
                ('OIN',7,'IP Network Objects',NULL,2),
                ('OIR',6,'IP Address Range Objects',NULL,2),
                ('ONS',9,'DNS Names',NULL,2),
                ('OPN',310,'OpenVPN Config',NULL,2),
                ('OSR',312,'OpenVPN Config SRV',NULL,2),
                ('PF',NULL,'Policy Forward Rules',NULL,1),
                ('PF6',NULL,'Policy Forward Rules IPv6',NULL,1),
                ('PI',NULL,'Policy IN Rules',NULL,1),
                ('PI6',NULL,'Policy IN Rules IPv6',NULL,1),
                ('PO',NULL,'Policy OUT Rules',NULL,1),
                ('PO6',NULL,'Policy OUT Rules IPv6',NULL,1),
                ('PRE',NULL,'CRT prefix folder',NULL,2),
                ('PRO',NULL,'OpenVPN server prefix',NULL,2),
                ('RR',NULL,'Routing rules',NULL,1),
                ('SOC',0,'Services Customs',NULL,2),
                ('SOG',21,'Services Groups',NULL,2),
                ('SOI',1,'IP Service Objects',NULL,2),
                ('SOM',3,'ICMP Service Objects',NULL,2),
                ('SOT',2,'TCP Service Objects',NULL,2),
                ('SOU',4,'UDP Service Objects',NULL,2),
                ('STD',NULL,'Standard objects folder',NULL,2);
        `);

        await queryRunner.query(`
            INSERT INTO ipobj_type VALUES 
                (0,'FIREWALL',NULL),
                (1,'IP',NULL),
                (2,'TCP',6),
                (3,'ICMP',1),
                (4,'UDP',17),
                (5,'ADDRESS',NULL),
                (6,'ADDRESS RANGE',NULL),
                (7,'NETWORK',NULL),
                (8,'HOST',NULL),
                (9,'DNS',NULL),
                (10,'INTERFACE FIREWALL',NULL),
                (11,'INTERFACE HOST',NULL),
                (20,'GROUP OBJECTS',NULL),
                (21,'GROUP SERVICES',NULL),
                (30,'IPTABLES MARKS',NULL),
                (100,'CLUSTER',NULL),
                (300,'CA',NULL),
                (301,'CRT_CLIENT',NULL),
                (302,'CRT_SERVER',NULL),
                (310,'OPENVPN CONFIG',NULL),
                (311,'OPENVPN CLI',NULL),
                (312,'OPENVPN SRV',NULL),
                (400,'CRT PREFIX FOLDER',NULL),
                (401,'OPENVPN SERVER PREFIX',NULL);
        `);

        await queryRunner.query(`
            INSERT INTO policy_type VALUES 
                (1,'I','Input',1,1),
                (2,'O','Output',2,1),
                (3,'F','Forward',3,1),
                (4,'S','SNAT',4,0),
                (5,'D','DNAT',5,0),
                (6,'R','Routing',6,1),
                (61,'I6','Input IPv6',1,1),
                (62,'O6','Output IPv6',2,1),
                (63,'F6','Forward IPv6',3,1),
                (64,'S6','SNAT IPv6',4,0),
                (65,'D6','DNAT IPv6',5,0);
        `);

        await queryRunner.query(`
            INSERT INTO policy_position VALUES 
                (1,'Source',1,2,'O',0),
                (2,'Destination',1,3,'O',0),
                (3,'Service',1,4,'O',0),
                (4,'Source',2,2,'O',0),
                (5,'Destination',2,3,'O',0),
                (6,'Service',2,4,'O',0),
                (7,'Source',3,3,'O',0),
                (8,'Destination',3,4,'O',0),
                (9,'Service',3,5,'O',0),
                (11,'Source',4,2,'O',0),
                (12,'Destination',4,3,'O',0),
                (13,'Service',4,4,'O',0),
                (14,'Translated Source',4,5,'O',1),
                (16,'Translated Service',4,6,'O',1),
                (20,'In',1,1,'I',0),
                (21,'Out',2,1,'I',0),
                (22,'In',3,1,'I',0),
                (24,'Out',4,1,'I',0),
                (25,'Out',3,2,'I',0),
                (30,'Source',5,2,'O',0),
                (31,'Destination',5,3,'O',0),
                (32,'Service',5,4,'O',0),
                (34,'Translated Destination',5,5,'O',1),
                (35,'Translated Service',5,6,'O',1),
                (36,'In',5,1,'I',0),
                (37,'Source',61,2,'O',0),
                (38,'Destination',61,3,'O',0),
                (39,'Service',61,4,'O',0),
                (40,'Source',62,2,'O',0),
                (41,'Destination',62,3,'O',0),
                (42,'Service',62,4,'O',0),
                (43,'Source',63,3,'O',0),
                (44,'Destination',63,4,'O',0),
                (45,'Service',63,5,'O',0),
                (46,'Source',64,2,'O',0),
                (47,'Destination',64,3,'O',0),
                (48,'Service',64,4,'O',0),
                (49,'Translated Source',64,5,'O',1),
                (50,'Translated Service',64,6,'O',1),
                (51,'In',61,1,'I',0),
                (52,'Out',62,1,'I',0),
                (53,'In',63,1,'I',0),
                (54,'Out',64,1,'I',0),
                (55,'Out',63,2,'I',0),
                (56,'Source',65,2,'O',0),
                (57,'Destination',65,3,'O',0),
                (58,'Service',65,4,'O',0),
                (59,'Translated Destination',65,5,'O',1),
                (60,'Translated Service',65,6,'O',1),
                (61,'In',65,1,'I',0);
        `);

        await queryRunner.query(`
            INSERT INTO ipobj_type__policy_position VALUES 
                (5,1),
                (6,1),
                (7,1),
                (8,1),
                (9,1),
                (10,1),
                (11,1),
                (20,1),
                (311,1),
                (401,1),
                (5,2),
                (6,2),
                (7,2),
                (8,2),
                (9,2),
                (10,2),
                (11,2),
                (20,2),
                (311,2),
                (401,2),
                (1,3),
                (2,3),
                (3,3),
                (4,3),
                (21,3),
                (5,4),
                (6,4),
                (7,4),
                (8,4),
                (9,4),
                (10,4),
                (11,4),
                (20,4),
                (311,4),
                (401,4),
                (5,5),
                (6,5),
                (7,5),
                (8,5),
                (9,5),
                (10,5),
                (11,5),
                (20,5),
                (311,5),
                (401,5),
                (1,6),
                (2,6),
                (3,6),
                (4,6),
                (21,6),
                (5,7),
                (6,7),
                (7,7),
                (8,7),
                (9,7),
                (10,7),
                (11,7),
                (20,7),
                (311,7),
                (401,7),
                (5,8),
                (6,8),
                (7,8),
                (8,8),
                (9,8),
                (10,8),
                (11,8),
                (20,8),
                (311,8),
                (401,8),
                (1,9),
                (2,9),
                (3,9),
                (4,9),
                (21,9),
                (5,11),
                (6,11),
                (7,11),
                (8,11),
                (9,11),
                (10,11),
                (11,11),
                (20,11),
                (311,11),
                (401,11),
                (5,12),
                (6,12),
                (7,12),
                (8,12),
                (9,12),
                (10,12),
                (11,12),
                (20,12),
                (311,12),
                (401,12),
                (1,13),
                (2,13),
                (3,13),
                (4,13),
                (21,13),
                (5,14),
                (6,14),
                (9,14),
                (311,14),
                (401,14),
                (2,16),
                (4,16),
                (10,20),
                (10,21),
                (10,22),
                (10,24),
                (10,25),
                (5,30),
                (6,30),
                (7,30),
                (8,30),
                (9,30),
                (10,30),
                (11,30),
                (20,30),
                (311,30),
                (401,30),
                (5,31),
                (6,31),
                (7,31),
                (8,31),
                (9,31),
                (10,31),
                (11,31),
                (20,31),
                (311,31),
                (401,31),
                (1,32),
                (2,32),
                (3,32),
                (4,32),
                (21,32),
                (5,34),
                (6,34),
                (9,34),
                (311,34),
                (401,34),
                (2,35),
                (4,35),
                (10,36),
                (5,37),
                (6,37),
                (7,37),
                (8,37),
                (9,37),
                (10,37),
                (11,37),
                (20,37),
                (5,38),
                (6,38),
                (7,38),
                (8,38),
                (9,38),
                (10,38),
                (11,38),
                (20,38),
                (1,39),
                (2,39),
                (3,39),
                (4,39),
                (21,39),
                (5,40),
                (6,40),
                (7,40),
                (8,40),
                (9,40),
                (10,40),
                (11,40),
                (20,40),
                (5,41),
                (6,41),
                (7,41),
                (8,41),
                (9,41),
                (10,41),
                (11,41),
                (20,41),
                (1,42),
                (2,42),
                (3,42),
                (4,42),
                (21,42),
                (5,43),
                (6,43),
                (7,43),
                (8,43),
                (9,43),
                (10,43),
                (11,43),
                (20,43),
                (5,44),
                (6,44),
                (7,44),
                (8,44),
                (9,44),
                (10,44),
                (11,44),
                (20,44),
                (1,45),
                (2,45),
                (3,45),
                (4,45),
                (21,45),
                (5,46),
                (6,46),
                (7,46),
                (8,46),
                (9,46),
                (10,46),
                (11,46),
                (20,46),
                (5,47),
                (6,47),
                (7,47),
                (8,47),
                (9,47),
                (10,47),
                (11,47),
                (20,47),
                (1,48),
                (2,48),
                (3,48),
                (4,48),
                (21,48),
                (5,49),
                (6,49),
                (9,49),
                (2,50),
                (4,50),
                (10,51),
                (10,52),
                (10,53),
                (10,54),
                (10,55),
                (5,56),
                (6,56),
                (7,56),
                (8,56),
                (9,56),
                (10,56),
                (11,56),
                (20,56),
                (5,57),
                (6,57),
                (7,57),
                (8,57),
                (9,57),
                (10,57),
                (11,57),
                (20,57),
                (1,58),
                (2,58),
                (3,58),
                (4,58),
                (21,58),
                (5,59),
                (6,59),
                (9,59),
                (2,60),
                (4,60),
                (10,61);
        `);

        await queryRunner.query(`
            INSERT INTO routing_position VALUES 
                (1,'Destination',NULL,'2017-02-21 12:43:27','2017-02-21 12:43:27',0,0),
                (2,'Gateway',NULL,'2017-02-21 12:43:27','2017-02-21 12:43:27',0,0),
                (3,'Interface',NULL,'2017-02-21 12:43:27','2017-02-21 12:43:27',0,0);
        `);

        await queryRunner.query(`
            INSERT INTO user VALUES 
                (1,1,'FWCloud admin user','info@soltecsis.com','fwcadmin','$2a$10$DPBdl3/ymJ9m47Wk8/ByBewWGOzNXhhBBoL7kN8N1bcEtR.rs1CGO',1,1,NULL,NULL,'','2019-05-06 10:22:14','2019-05-06 10:22:14',1,1);
        `);

        //ipobj_std
        const defaultQueries = fs.readFileSync('config/data_ini/ipobj_std.sql', { encoding: 'UTF-8' })
                .toString()
                .replace(new RegExp('\'', 'gm'), '"')
                .replace(new RegExp('^--.*\n', 'gm'), '')
                .replace(/(\r\n|\n|\r)/gm, " ")
                .replace(/\s+/g, ' ')
                .split(';');

            for(let i: number = 0; i < defaultQueries.length; i++) {
                let query = defaultQueries[i].trim();

                if (query !== '') {
                    await queryRunner.query(query);
                }
            }
    }

    public async down(queryRunner: QueryRunner): Promise<any> {        
        await queryRunner.query('DELETE FROM ipobj__ipobjg');
        await queryRunner.query('DELETE FROM ipobj_g');
        await queryRunner.query('DELETE FROM ipobj');
        await queryRunner.query('DELETE FROM routing_position');
        await queryRunner.query('DELETE FROM ipobj_type__policy_position');
        await queryRunner.query('DELETE FROM policy_position');
        await queryRunner.query('DELETE FROM policy_type');
        await queryRunner.query('DELETE FROM ipobj_type');
        await queryRunner.query('DELETE FROM fwc_tree_node_types');
        await queryRunner.query('DELETE FROM user__fwcloud');
        await queryRunner.query('DELETE FROM user');
        await queryRunner.query('DELETE FROM customer');
    }

}
