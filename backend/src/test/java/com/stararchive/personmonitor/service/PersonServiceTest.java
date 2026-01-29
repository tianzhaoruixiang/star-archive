package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.dto.PersonDetailDTO;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PersonSocialDynamicRepository;
import com.stararchive.personmonitor.repository.PersonTravelRepository;
import com.stararchive.personmonitor.repository.TagRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * PersonService 单元测试
 */
class PersonServiceTest {
    
    @Mock
    private PersonRepository personRepository;
    
    @Mock
    private PersonTravelRepository travelRepository;
    
    @Mock
    private PersonSocialDynamicRepository socialDynamicRepository;
    
    @Mock
    private TagRepository tagRepository;
    
    @InjectMocks
    private PersonService personService;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }
    
    @Test
    void testGetPersonList() {
        Person person = new Person();
        person.setPersonId("test-id");
        person.setChineseName("测试人员");
        
        Page<Person> personPage = new PageImpl<>(Collections.singletonList(person), 
                PageRequest.of(0, 20), 1);
        when(personRepository.findAll(any(PageRequest.class))).thenReturn(personPage);
        
        PageResponse<PersonCardDTO> result = personService.getPersonList(0, 20);
        
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("测试人员", result.getContent().get(0).getChineseName());
    }
    
    @Test
    void testGetPersonDetail() {
        Person person = new Person();
        person.setPersonId("test-id");
        person.setChineseName("测试人员");
        
        when(personRepository.findById("test-id")).thenReturn(Optional.of(person));
        when(travelRepository.findByPersonIdOrderByEventTimeDesc(any(), any()))
                .thenReturn(Page.empty());
        when(socialDynamicRepository.findByPersonId(any())).thenReturn(Collections.emptyList());
        
        PersonDetailDTO detail = personService.getPersonDetail("test-id");
        
        assertNotNull(detail);
        assertEquals("测试人员", detail.getChineseName());
    }
    
    @Test
    void testGetPersonDetailNotFound() {
        when(personRepository.findById("not-exist")).thenReturn(Optional.empty());
        
        assertThrows(EntityNotFoundException.class, () -> {
            personService.getPersonDetail("not-exist");
        });
    }
}
