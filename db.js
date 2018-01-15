var logger = require('log4js').getLogger("app");

var mysql = require('mysql');

var PRODUCTION_DB = 'fwcloud_db'
        , TEST_DB = 'fwcloud_db';

exports.MODE_TEST = 'mode_test';
exports.MODE_PRODUCTION = 'mode_production';

var state = {
    pool: null,
    mode: null,
    commit:1
};

var conn = null;

exports.connect = function (mode, commit, done) {
    state.pool = mysql.createPool({
        connectionLimit: 100,
        host: 'localhost',
        user: 'soltecsis',
        password: 'WdQ?:(x4',
        database: mode === exports.MODE_PRODUCTION ? PRODUCTION_DB : TEST_DB

    });

    state.mode = mode;
    state.commit=commit;
    
    state.pool.getConnection(function (err, connection) {
        if (err)
            return done(err);
        else {
            conn = connection;
            var sql ="SET AUTOCOMMIT=" + state.commit + ";";
            conn.query(sql, function (error, result) {});
            logger.debug("---- DATABASE CONNECTED in MODE: " +  state.mode + "  AUTOCOMMIT: " + state.commit + "  -----");
        }
    });
    done();
};

exports.getpool = function () {
    return state.pool;
};

exports.get = function (done) {
    var pool = state.pool;
    if (!pool)
        return done(new Error('Missing database connection.'));

    done(null, conn);

};

exports.lockTableCon = function(table, where,  done){    
    conn.query("SELECT count(*) from " + table + " " + where + " FOR UPDATE;", function (error, result) {
        if (error)
            logger.debug("DATABASE ERROR IN LOCK TABLE : " + error );
        else
            logger.debug("TABLE " + table  + " LOCKED");
    });
    done();
};

exports.startTX = function(cn, done){    
    cn.query("START TRANSACTION;", function (error, result) {
        if (error)
            logger.debug("DATABASE ERROR IN START TRANSACTION : " + error );
        else
            logger.debug("START TX");
    });
    done();
};
exports.startTXcon = function(done){    
    conn.query("START TRANSACTION;", function (error, result) {
        if (error)
            logger.debug("DATABASE ERROR IN START TRANSACTION : " + error );
        else
            logger.debug("START TX");
    });
    done();
};

exports.endTX = function(cn, done){    
    cn.query("COMMIT;", function (error, result) {
        if (error)
            logger.debug("DATABASE ERROR IN COMMIT TRANSACTION: " + error);
        else
            logger.debug("END TX");
    });
    done();
};

exports.endTXcon = function(done){    
    conn.query("COMMIT;", function (error, result) {
        if (error)
            logger.debug("DATABASE ERROR IN COMMIT TRANSACTION: " + error);
        else
            logger.debug("END TX");
    });
    done();
};

exports.backTX = function(cn, done){    
    cn.query("ROLLBACK;", function (error, result) {
        if (error)
            logger.debug("DATABASE ERROR IN ROLLBACK TRANSACTION ");
        else
            logger.debug("ROLLBACK TX");
    });
    done();
};

exports.backTXcon = function(done){    
    conn.query("ROLLBACK;", function (error, result) {
        if (error)
            logger.debug("DATABASE ERROR IN ROLLBACK TRANSACTION ");
        else
            logger.debug("ROLLBACK TX");
    });
    done();
};