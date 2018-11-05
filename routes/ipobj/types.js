var express = require('express');
var router = express.Router();
var Ipobj_typeModel = require('../../models/ipobj/ipobj_type');
var api_resp = require('../../utils/api_response');
var objModel = 'IPOBJ TYPE';

/* Get all ipobj_types */
router.get('/', (req, res) => {
	Ipobj_typeModel.getIpobj_types((error, data) => {
		//If exists ipobj_type get data
		if (data && data.length > 0)
			api_resp.getJson(data, api_resp.ACR_OK, '', objModel, null, jsonResp => res.status(200).json(jsonResp));
		else
			api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'not found', objModel, null, jsonResp => res.status(200).json(jsonResp));
	});
});

/* Get  ipobj_type by id */
router.put('/get', (req, res) => {
	Ipobj_typeModel.getIpobj_type(req.body.id, (error, data) => {
		//If exists ipobj_type get data
		if (data && data.length > 0)
			api_resp.getJson(data, api_resp.ACR_OK, '', objModel, null, jsonResp => res.status(200).json(jsonResp));
		else
			api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'not found', objModel, null, jsonResp => res.status(200).json(jsonResp));
	});
});

module.exports = router;