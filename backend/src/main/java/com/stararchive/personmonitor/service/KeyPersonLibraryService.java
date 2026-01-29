package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.DirectoryDTO;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.entity.Directory;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.PersonDirectory;
import com.stararchive.personmonitor.repository.DirectoryRepository;
import com.stararchive.personmonitor.repository.PersonDirectoryRepository;
import com.stararchive.personmonitor.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 重点人员库服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KeyPersonLibraryService {

    private final DirectoryRepository directoryRepository;
    private final PersonDirectoryRepository personDirectoryRepository;
    private final PersonRepository personRepository;
    private final PersonService personService;

    /**
     * 获取所有重点人员库目录（左侧列表，含人员数量）
     */
    public List<DirectoryDTO> listDirectories() {
        log.info("查询重点人员库目录列表");
        List<Directory> dirs = directoryRepository.findByParentDirectoryIdIsNullOrderByDirectoryId();
        return dirs.stream()
                .map(d -> {
                    long count = personDirectoryRepository.countById_DirectoryId(d.getDirectoryId());
                    return new DirectoryDTO(d.getDirectoryId(), d.getDirectoryName(), count);
                })
                .collect(Collectors.toList());
    }

    /**
     * 按目录分页查询人员卡片（每页 16 条）
     */
    public PageResponse<PersonCardDTO> getPersonsByDirectory(Integer directoryId, int page, int size) {
        log.info("按目录查询人员: directoryId={}, page={}, size={}", directoryId, page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<PersonDirectory> pdPage = personDirectoryRepository.findById_DirectoryId(directoryId, pageable);
        List<String> personIds = pdPage.getContent().stream()
                .map(pd -> pd.getId().getPersonId())
                .collect(Collectors.toList());
        List<Person> persons = personRepository.findAllById(personIds);
        java.util.Map<String, Person> personMap = persons.stream()
                .collect(Collectors.toMap(Person::getPersonId, p -> p));
        List<PersonCardDTO> cards = personIds.stream()
                .map(id -> personMap.get(id))
                .filter(p -> p != null)
                .map(personService::toCardDTO)
                .collect(Collectors.toList());
        return PageResponse.of(cards, page, size, pdPage.getTotalElements());
    }
}
