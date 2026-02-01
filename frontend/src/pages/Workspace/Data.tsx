import { Row, Col, Card, Tree, Button, Upload, Empty } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';

const WorkspaceData = () => {
  const [personalTree] = useState<unknown[]>([]);
  const [publicTree] = useState<unknown[]>([]);

  return (
    <Row gutter={24}>
      <Col span={12}>
        <Card size="small" title="个人区" extra={<Upload><Button type="link" icon={<UploadOutlined />}>上传</Button></Upload>}>
          {personalTree.length === 0 ? (
            <Empty description="暂无文件，支持文件夹管理、Word/Excel/CSV 上传" />
          ) : (
            <Tree showLine treeData={personalTree as never[]} />
          )}
        </Card>
      </Col>
      <Col span={12}>
        <Card size="small" title="公共区">
          {publicTree.length === 0 ? (
            <Empty description="公共区文档所有人可见" />
          ) : (
            <Tree showLine treeData={publicTree as never[]} />
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default WorkspaceData;
