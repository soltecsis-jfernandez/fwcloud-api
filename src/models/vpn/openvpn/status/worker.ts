import { getRepository } from "typeorm";
import { Application } from "../../../../Application";
import { AgentCommunication } from "../../../../communications/agent.communication";
import { OpenVPNHistoryRecord } from "../../../../communications/communication";
import db from "../../../../database/database-manager";
import { Firewall, FirewallInstallCommunication } from "../../../firewall/Firewall";
import { OpenVPN } from "../OpenVPN";
import { OpenVPNOption } from "../openvpn-option.model";
import { OpenVPNStatusHistoryService } from "./openvpn-status-history.service";

async function iterate(application: Application): Promise<void> {
    try {
        const service: OpenVPNStatusHistoryService = await application.getService(OpenVPNStatusHistoryService.name);

        const openvpns: OpenVPN[] = await getRepository(OpenVPN).createQueryBuilder('openvpn')
            .innerJoin('openvpn.crt', 'crt')
            .innerJoinAndSelect('openvpn.firewall', 'firewall')
            .where('openvpn.parentId IS NULL')
            .andWhere('crt.type =  2')
            .andWhere('firewall.install_communication = :communication', {
                communication: FirewallInstallCommunication.Agent
            }).getMany();

        for(let openvpn of openvpns) {

            const firewalls: Firewall[] = openvpn.firewall.clusterId
                ? await getRepository(Firewall).createQueryBuilder('firewall')
                    .where('firewall.clusterId = :cluster', {cluster: openvpn.firewall.clusterId})
                    .andWhere('firewall.install_communication = :communication', {
                        communication: FirewallInstallCommunication.Agent
                    })
                    .getMany()
                : [openvpn.firewall];

            for(let firewall of firewalls) {
                const communication: AgentCommunication = await firewall.getCommunication() as AgentCommunication;

                const statusOption: OpenVPNOption = await OpenVPN.getOptData(db.getQuery(), openvpn.id, 'status') as OpenVPNOption;

                if (statusOption) {

                    const data: OpenVPNHistoryRecord[] = await communication.getOpenVPNHistoryFile(statusOption.arg);

                    await service.create(openvpn.id, data.map(item => ({
                        timestamp: item.timestamp,
                        name: item.name,
                        address: item.address,
                        bytesReceived: item.bytesReceived,
                        bytesSent: item.bytesSent,
                        connectedAt: item.connectedAt
                    })));
                }
            }
        }
    } catch(e) {
        application.logger().error(`WorkerError: ${e.message}`);
    }
}

async function work(): Promise<void> {
    const application = await Application.run();

    await iterate(application);
    setInterval(async () => {
        await iterate(application);
    }, 1 * 60 * 1000);
}

work().then(() => {}).catch(error => {
    console.error(error);
    throw error;
})