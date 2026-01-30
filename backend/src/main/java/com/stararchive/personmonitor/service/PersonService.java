package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.*;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.PersonSocialDynamic;
import com.stararchive.personmonitor.entity.PersonTravel;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PersonSocialDynamicRepository;
import com.stararchive.personmonitor.repository.PersonTravelRepository;
import com.stararchive.personmonitor.repository.TagRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 人员档案服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PersonService {
    
    private final PersonRepository personRepository;
    private final PersonTravelRepository travelRepository;
    private final PersonSocialDynamicRepository socialDynamicRepository;
    private final TagRepository tagRepository;
    
    /**
     * 分页查询人员列表
     */
    public PageResponse<PersonCardDTO> getPersonList(int page, int size) {
        log.info("查询人员列表: page={}, size={}", page, size);
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedTime"));
        Page<Person> personPage = personRepository.findAll(pageable);
        
        List<PersonCardDTO> cards = personPage.getContent().stream()
                .map(this::convertToCardDTO)
                .collect(Collectors.toList());
        
        return PageResponse.of(cards, page, size, personPage.getTotalElements());
    }
    
    /**
     * 根据标签查询人员
     */
    public PageResponse<PersonCardDTO> getPersonListByTag(String tag, int page, int size) {
        log.info("根据标签查询人员: tag={}, page={}, size={}", tag, page, size);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Person> personPage = personRepository.findByTag(tag, pageable);
        
        List<PersonCardDTO> cards = personPage.getContent().stream()
                .map(this::convertToCardDTO)
                .collect(Collectors.toList());
        
        return PageResponse.of(cards, page, size, personPage.getTotalElements());
    }
    
    /**
     * 获取人员详情
     */
    public PersonDetailDTO getPersonDetail(String personId) {
        log.info("查询人员详情: personId={}", personId);
        
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("人员不存在: " + personId));
        
        PersonDetailDTO detail = convertToDetailDTO(person);
        
        Pageable travelPageable = PageRequest.of(0, 10);
        Page<PersonTravel> travels = travelRepository.findByPersonIdOrderByEventTimeDesc(personId, travelPageable);
        detail.setRecentTravels(travels.getContent().stream()
                .map(this::convertToTravelDTO)
                .collect(Collectors.toList()));
        
        List<PersonSocialDynamic> socials = socialDynamicRepository.findByPersonId(personId)
                .stream()
                .limit(10)
                .toList();
        detail.setRecentSocialDynamics(socials.stream()
                .map(this::convertToSocialDTO)
                .collect(Collectors.toList()));
        
        return detail;
    }
    
    /**
     * 获取标签树（含每个标签对应人员数量）
     */
    public List<TagDTO> getTagTree() {
        log.info("查询标签树");
        return tagRepository.findAllOrderByHierarchy().stream()
                .map(tag -> {
                    TagDTO dto = new TagDTO();
                    dto.setTagId(tag.getTagId());
                    dto.setFirstLevelName(tag.getFirstLevelName());
                    dto.setSecondLevelName(tag.getSecondLevelName());
                    dto.setTagName(tag.getTagName());
                    dto.setTagDescription(tag.getTagDescription());
                    dto.setParentTagId(tag.getParentTagId());
                    try {
                        dto.setPersonCount(personRepository.countByPersonTagsContaining(tag.getTagName()));
                    } catch (Exception e) {
                        dto.setPersonCount(0L);
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * 转为人员卡片 DTO（供其他服务复用）
     */
    public PersonCardDTO toCardDTO(Person person) {
        return convertToCardDTO(person);
    }

    private PersonCardDTO convertToCardDTO(Person person) {
        PersonCardDTO dto = new PersonCardDTO();
        dto.setPersonId(person.getPersonId());
        dto.setChineseName(person.getChineseName());
        dto.setOriginalName(person.getOriginalName());
        dto.setAvatarUrl(person.getAvatarFiles() != null && !person.getAvatarFiles().isEmpty() 
                ? person.getAvatarFiles().get(0) : null);
        dto.setIdCardNumber(person.getIdCardNumber());
        dto.setBirthDate(person.getBirthDate());
        dto.setPersonTags(person.getPersonTags());
        dto.setUpdatedTime(person.getUpdatedTime());
        dto.setIsKeyPerson(person.getIsKeyPerson());
        dto.setHouseholdAddress(person.getHouseholdAddress());
        dto.setPhoneSummary(person.getPhoneNumbers() != null && !person.getPhoneNumbers().isEmpty()
                ? person.getPhoneNumbers().get(0) : null);
        dto.setRemark(person.getRemark());
        dto.setBelongingGroup(person.getBelongingGroup());
        return dto;
    }

    private PersonDetailDTO convertToDetailDTO(Person person) {
        PersonDetailDTO dto = new PersonDetailDTO();
        dto.setPersonId(person.getPersonId());
        dto.setChineseName(person.getChineseName());
        dto.setOriginalName(person.getOriginalName());
        dto.setAliasNames(person.getAliasNames());
        dto.setAvatarUrl(person.getAvatarFiles() != null && !person.getAvatarFiles().isEmpty() 
                ? person.getAvatarFiles().get(0) : null);
        dto.setGender(person.getGender());
        dto.setBirthDate(person.getBirthDate());
        dto.setNationality(person.getNationality());
        dto.setNationalityCode(person.getNationalityCode());
        dto.setHouseholdAddress(person.getHouseholdAddress());
        dto.setOrganization(person.getOrganization());
        dto.setBelongingGroup(person.getBelongingGroup());
        dto.setHighestEducation(person.getHighestEducation());
        dto.setPhoneNumbers(person.getPhoneNumbers());
        dto.setEmails(person.getEmails());
        dto.setPassportNumbers(person.getPassportNumbers());
        dto.setIdCardNumber(person.getIdCardNumber());
        dto.setTwitterAccounts(person.getTwitterAccounts());
        dto.setLinkedinAccounts(person.getLinkedinAccounts());
        dto.setFacebookAccounts(person.getFacebookAccounts());
        dto.setPersonTags(person.getPersonTags());
        dto.setWorkExperience(person.getWorkExperience());
        dto.setEducationExperience(person.getEducationExperience());
        dto.setRemark(person.getRemark());
        dto.setIsKeyPerson(person.getIsKeyPerson());
        dto.setCreatedTime(person.getCreatedTime());
        dto.setUpdatedTime(person.getUpdatedTime());
        return dto;
    }
    
    private PersonTravelDTO convertToTravelDTO(PersonTravel travel) {
        PersonTravelDTO dto = new PersonTravelDTO();
        dto.setTravelId(travel.getTravelId());
        dto.setPersonId(travel.getPersonId());
        dto.setEventTime(travel.getEventTime());
        dto.setPersonName(travel.getPersonName());
        dto.setDeparture(travel.getDeparture());
        dto.setDestination(travel.getDestination());
        dto.setTravelType(travel.getTravelType());
        dto.setTicketNumber(travel.getTicketNumber());
        dto.setVisaType(travel.getVisaType());
        return dto;
    }
    
    private SocialDynamicDTO convertToSocialDTO(PersonSocialDynamic social) {
        SocialDynamicDTO dto = new SocialDynamicDTO();
        dto.setDynamicId(social.getDynamicId());
        dto.setSocialAccountType(social.getSocialAccountType());
        dto.setSocialAccount(social.getSocialAccount());
        dto.setTitle(social.getTitle());
        dto.setContent(social.getContent());
        dto.setImageUrls(social.getImageFiles());
        dto.setPublishTime(social.getPublishTime());
        dto.setPublishLocation(social.getPublishLocation());
        dto.setLikeCount(social.getLikeCount());
        dto.setShareCount(social.getShareCount());
        dto.setCommentCount(social.getCommentCount());
        dto.setViewCount(social.getViewCount());
        return dto;
    }
}
