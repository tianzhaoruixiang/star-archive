import { useEffect, useState } from 'react';
import { Card, Row, Col, List, Pagination, Spin, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Tag } from 'antd';
import { keyPersonLibraryAPI } from '@/services/api';
import './index.css';

interface DirectoryItem {
  directoryId: number;
  directoryName: string;
  personCount: number;
}

interface PersonCard {
  personId: string;
  chineseName?: string;
  idCardNumber?: string;
  birthDate?: string;
  personTags?: string[];
  updatedTime?: string;
  isKeyPerson?: boolean;
}

const KeyPersonLibrary = () => {
  const navigate = useNavigate();
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [selectedDirId, setSelectedDirId] = useState<number | null>(null);
  const [list, setList] = useState<PersonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirLoading, setDirLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, size: 16, total: 0 });

  useEffect(() => {
    keyPersonLibraryAPI.getDirectories().then((res: any) => {
      const data = res?.data ?? res;
      setDirectories(Array.isArray(data) ? data : []);
      setDirLoading(false);
      if (data?.length && selectedDirId === null) {
        setSelectedDirId(data[0].directoryId);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedDirId == null) return;
    setLoading(true);
    keyPersonLibraryAPI
      .getPersonsByDirectory(selectedDirId, pagination.page, pagination.size)
      .then((res: any) => {
        const d = res?.data ?? res;
        const content = d?.content ?? d?.list ?? [];
        const total = d?.totalElements ?? d?.total ?? 0;
        setList(Array.isArray(content) ? content : []);
        setPagination((p) => ({ ...p, total }));
      })
      .finally(() => setLoading(false));
  }, [selectedDirId, pagination.page, pagination.size]);

  const handlePageChange = (page: number, size: number) => {
    setPagination((p) => ({ ...p, page: page - 1, size }));
  };

  const handleCardClick = (personId: string) => {
    navigate(`/persons/${personId}`);
  };

  return (
    <div className="key-person-library">
      <Row gutter={16}>
        <Col span={6}>
          <Card title="重点人员库目录" loading={dirLoading}>
            <List
              dataSource={directories}
              renderItem={(item) => (
                <List.Item
                  className={selectedDirId === item.directoryId ? 'dir-item-active' : ''}
                  onClick={() => {
                    setSelectedDirId(item.directoryId);
                    setPagination((p) => ({ ...p, page: 0 }));
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{item.directoryName}</span>
                  <Tag color="blue">{item.personCount}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={18}>
          <Card title={directories.find((d) => d.directoryId === selectedDirId)?.directoryName ?? '人员列表'}>
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
              </div>
            ) : list.length === 0 ? (
              <Empty description="该库暂无人员" />
            ) : (
              <>
                <Row gutter={[16, 16]}>
                  {list.map((person) => (
                    <Col span={6} key={person.personId}>
                      <Card
                        hoverable
                        className="person-card"
                        onClick={() => handleCardClick(person.personId)}
                      >
                        <div className="person-avatar">
                          {person.chineseName?.charAt(0) ?? '?'}
                        </div>
                        <div className="person-name">{person.chineseName}</div>
                        <div className="person-id">{person.idCardNumber ?? '—'}</div>
                        <div className="person-birth">
                          {person.birthDate
                            ? new Date(person.birthDate).toLocaleDateString()
                            : '—'}
                        </div>
                        <div className="person-tags">
                          {person.personTags?.slice(0, 2).map((tag: string, idx: number) => (
                            <Tag key={idx} color="blue" style={{ fontSize: 12 }}>
                              {tag}
                            </Tag>
                          ))}
                        </div>
                        {person.isKeyPerson && (
                          <Tag color="red" className="key-person-tag">
                            重点
                          </Tag>
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>
                <div className="pagination-container">
                  <Pagination
                    current={pagination.page + 1}
                    pageSize={pagination.size}
                    total={pagination.total}
                    onChange={handlePageChange}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 条`}
                  />
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default KeyPersonLibrary;
