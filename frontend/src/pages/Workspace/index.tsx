import { Tabs, Card, Tree, Button, Upload, Empty, Row, Col } from 'antd';
import { FolderOutlined, FileWordOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import './index.css';

const { TabPane } = Tabs;

const Workspace = () => {
  const [personalTree, setPersonalTree] = useState<any[]>([]);
  const [publicTree, setPublicTree] = useState<any[]>([]);

  return (
    <div className="workspace-page">
      <Card title="个人工作区">
        <Tabs defaultActiveKey="data">
          <TabPane tab="数据管理" key="data">
            <Row gutter={24}>
              <Col span={12}>
                <Card size="small" title="个人区" extra={<Upload><Button type="link" icon={<UploadOutlined />}>上传</Button></Upload>}>
                  {personalTree.length === 0 ? (
                    <Empty description="暂无文件，支持文件夹管理、Word/Excel/CSV 上传" />
                  ) : (
                    <Tree showLine treeData={personalTree} />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="公共区">
                  {publicTree.length === 0 ? (
                    <Empty description="公共区文档所有人可见" />
                  ) : (
                    <Tree showLine treeData={publicTree} />
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>
          <TabPane tab="模型管理" key="model">
            <Card>
              <div className="placeholder-block">
                <PlusOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <p>新建模型，通过建模精细化锁定重点人员；运行模型可展示符合条件人员卡片</p>
                <Button type="primary" disabled>新建模型（待对接）</Button>
              </div>
            </Card>
          </TabPane>
          <TabPane tab="档案融合" key="fusion">
            <Card title="档案智能化提取">
              <div className="placeholder-block">
                <FileWordOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <p>支持 Word、Excel、CSV 上传，大模型提取档案并与库内人员比对（原始姓名+出生日期+性别+国籍）</p>
                <Button type="primary" disabled>上传并提取（待对接）</Button>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Workspace;
