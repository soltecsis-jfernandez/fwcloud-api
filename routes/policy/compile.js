/**
 * Module to routing COMPILE requests
 * <br>BASE ROUTE CALL: <b>/policy/compile</b>
 *
 * @module Compile
 *
 * @requires express
 * @requires Policy_rModel
 *
 */


/**
 * Class to manage Compile Policy
 *
 * @class CompileRouter
 */


/**
 * Property  to manage express
 *
 * @property express
 * @type express
 */
var express = require('express');
/**
 * Property  to manage  route
 *
 * @property router
 * @type express.Router
 */
var router = express.Router();

/**
 * Property Logger to manage App logs
 *
 * @property logger
 * @type log4js/app
 *
 */
var logger = require('log4js').getLogger("compiler");
/**
 * Property Model to manage API RESPONSE data
 *
 * @property api_resp
 * @type ../../models/api_response
 *
 */
var api_resp = require('../../utils/api_response');

/**
 * Property Model to manage compilation process
 *
 * @property RuleCompileModel
 * @type ../../models/compile/
 */
var RuleCompile = require('../../models/policy/rule_compile');

/**
 * Property Model to manage policy script generation and install process
 *
 * @property PolicyScript
 * @type ../../models/compile/
 */
var PolicyScript = require('../../models/policy/policy_script');

var streamModel = require('../../models/stream/stream');

var config = require('../../config/config');

var utilsModel = require("../../utils/utils.js");

var FirewallModel = require('../../models/firewall/firewall');

const POLICY_TYPE = ['', 'INPUT', 'OUTPUT', 'FORWARD', 'SNAT', 'DNAT'];



/*----------------------------------------------------------------------------------------------------------------------*/
/* Compile a firewall rule. */
/*----------------------------------------------------------------------------------------------------------------------*/
router.put('/rule',
utilsModel.checkFirewallAccess, 
(req, res) => {
  /* The get method of the RuleCompile model returns a promise. */
  RuleCompile.get(req.body.fwcloud, req.body.idfirewall, req.body.type, req.body.rule)
	.then(data => api_resp.getJson({"result": true, "cs": data}, api_resp.ACR_OK, '', 'COMPILE', null, jsonResp => res.status(200).json(jsonResp)))
	.catch(error => api_resp.getJson(error, api_resp.ACR_ERROR, '', 'COMPILE', error, jsonResp => res.status(200).json(jsonResp)));
});
/*----------------------------------------------------------------------------------------------------------------------*/

/*----------------------------------------------------------------------------------------------------------------------*/
/* Compile a firewall. */
/*----------------------------------------------------------------------------------------------------------------------*/
router.put('/',
utilsModel.checkFirewallAccess, 
(req, res) => {
	var accessData = {sessionID: req.sessionID, iduser: req.session.user_id};

	var fs = require('fs');
	var path = config.get('policy').data_dir;
	if (!fs.existsSync(path))
		fs.mkdirSync(path);
	path += "/" + req.body.fwcloud;
	if (!fs.existsSync(path))
		fs.mkdirSync(path);
	path += "/" + req.body.idfirewall;
	if (!fs.existsSync(path))
		fs.mkdirSync(path);
	path += "/" + config.get('policy').script_name;
	var stream = fs.createWriteStream(path);

	stream.on('open', fd => {
		/* Generate the policy script. */
		PolicyScript.append(config.get('policy').header_file)
		.then(data => PolicyScript.dumpFirewallOptions(req.body.fwcloud,req.body.idfirewall,data))
		.then(data => {
			stream.write(data.cs + "greeting_msg() {\n" +
				"log \"FWCloud.net - Loading firewall policy generated: " + Date() + "\"\n}\n\n" +
				"policy_load() {\n");
			
			if (data.options & 0x0001) { // Statefull firewall
				stream.write("# Statefull firewall.\n" +
					"$IPTABLES -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT\n" +
					"$IPTABLES -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT\n" +
					"$IPTABLES -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT\n");
				streamModel.pushMessageCompile(accessData, "--- STATEFULL FIREWALL ---\n\n");
			}
			else
				streamModel.pushMessageCompile(accessData, "--- STATELESS FIREWALL ---\n\n");
			streamModel.pushMessageCompile(accessData, "INPUT TABLE:\n");
			stream.write("\n\necho -e \"\\nINPUT TABLE\\n-----------\"\n");
			return PolicyScript.dump(accessData,req.body.idfirewall,1);
		})
		.then(cs => {
			streamModel.pushMessageCompile(accessData, "\nOUTPUT TABLE\n");
			stream.write(cs + "\n\necho -e \"\\nOUTPUT TABLE\\n------------\"\n");
			return PolicyScript.dump(accessData,req.body.idfirewall,2);
		})
		.then(cs => {
			streamModel.pushMessageCompile(accessData, "\nFORWARD TABLE\n");
			stream.write(cs + "\n\necho -e \"\\nFORWARD TABLE\\n-------------\"\n");
			return PolicyScript.dump(accessData,req.body.idfirewall,3);
		})
		.then(cs => {
			streamModel.pushMessageCompile(accessData, "\nSNAT TABLE\n");
			stream.write(cs + "\n\necho -e \"\\nSNAT TABLE\\n----------\"\n");
			return PolicyScript.dump(accessData,req.body.idfirewall,4);
		})
		.then(cs => {
			streamModel.pushMessageCompile(accessData, "\nDNAT TABLE\n");
			stream.write(cs + "\n\necho -e \"\\nDNAT TABLE\\n----------\"\n");
			return PolicyScript.dump(accessData,req.body.idfirewall, 5);
		})
		.then(cs => {
			stream.write(cs+"\n}\n\n");
			return PolicyScript.append(config.get('policy').footer_file);
		})
		.then(data => {
			stream.write(data.cs);
			streamModel.pushMessageCompile(accessData,"END\n");
			return FirewallModel.updateFirewallStatus(req.body.fwcloud,req.body.idfirewall,"&~1");
		})
		.then(() => {
			/* Close stream. */
			stream.end();
			api_resp.getJson(null, api_resp.ACR_OK, '', 'COMPILE', null, jsonResp => res.status(200).json(jsonResp))
		})
		.catch(error => api_resp.getJson(null, api_resp.ACR_ERROR, '', 'COMPILE', error, jsonResp => res.status(200).json(jsonResp)));
	}).on('error', error => api_resp.getJson(null, api_resp.ACR_ERROR, '', 'COMPILE', error, jsonResp => res.status(200).json(jsonResp)))
});
/*----------------------------------------------------------------------------------------------------------------------*/

module.exports = router;

