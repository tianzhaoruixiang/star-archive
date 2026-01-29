package com.stararchive.personmonitor.config;

import org.hibernate.dialect.DatabaseVersion;
import org.hibernate.dialect.MySQLDialect;

/**
 * Doris数据库方言 - 继承MySQL方言并进行适配
 */
public class DorisDialect extends MySQLDialect {
    
    public DorisDialect() {
        super(DatabaseVersion.make(8, 0));
    }
    
    @Override
    public boolean supportsPartitionBy() {
        return false;
    }
    
    @Override
    public boolean supportsCommentOn() {
        return false;
    }
    
    @Override
    public boolean supportsIfExistsBeforeTableName() {
        return true;
    }
    
    @Override
    public boolean supportsIfExistsAfterTableName() {
        return false;
    }
    
    @Override
    public String getTableTypeString() {
        return "";
    }
}
