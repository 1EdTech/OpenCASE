# 1EdTech Competencies and Academic Standards Exchange (CASE) Service
1EdTech Final Release

[![1EdTech Logo](files/general/1edtech_logo_color_with_tagline.svg)](https://www.1edtech.org/)

1EdTech Final Release  
Version 1.0
-----------------------------------


|Date Issued:   |24th January, 2025                     |
|---------------|---------------------------------------|
|Latest version:|http://www.imsglobal.org/activity/case/|


IPR and Distribution Notices

Recipients of this document are requested to submit, with their comments, notification of any relevant patent claims or other intellectual property rights of which they may be aware that might be infringed by any implementation of the specification set forth in this document, and to provide supporting documentation.

1EdTech takes no position regarding the validity or scope of any intellectual property or other rights that might be claimed to pertain to the implementation or use of the technology described in this document or the extent to which any license under such rights might or might not be available; neither does it represent that it has made any effort to identify any such rights. Information on 1EdTech's procedures with respect to rights in 1EdTech specifications can be found at the 1EdTech Intellectual Property Rights web page: [https://www.1edtech.org/ipr/1edtechipr\_policyFinal.pdf](https://www.imsglobal.org/ipr/imsipr_policyFinal.pdf).



* Org Name: Common Good Learning Tools
  * Date Election Made: 15th January 2025
  * Necessary Claims: No
  * Type: RF RAND (Required & Optional Elements)
* Org Name: Infinite Campus
  * Date Election Made: 23rd January 2025
  * Necessary Claims: No
  * Type: RF RAND (Required & Optional Elements)
* Org Name: UNICON INC.
  * Date Election Made: 14th January 2025
  * Necessary Claims: No
  * Type: RF RAND (Required & Optional Elements)


Copyright © 2025 1EdTech Consortium. All Rights Reserved.

Use of this specification to develop products or services is governed by the license with 1EdTech found on the 1EdTech website: [https://www.1edtech.org/speclicense.html](https://www.imsglobal.org/speclicense.html).

Permission is granted to all parties to use excerpts from this document as needed in producing requests for proposals.

The limited permissions granted above are perpetual and will not be revoked by 1EdTech or its successors or assigns.

THIS SPECIFICATION IS BEING OFFERED WITHOUT ANY WARRANTY WHATSOEVER, AND IN PARTICULAR, ANY WARRANTY OF NONINFRINGEMENT IS EXPRESSLY DISCLAIMED. ANY USE OF THIS SPECIFICATION SHALL BE MADE ENTIRELY AT THE IMPLEMENTER'S OWN RISK, AND NEITHER THE CONSORTIUM, NOR ANY OF ITS MEMBERS OR SUBMITTERS, SHALL HAVE ANY LIABILITY WHATSOEVER TO ANY IMPLEMENTER OR THIRD PARTY FOR ANY DAMAGES OF ANY NATURE WHATSOEVER, DIRECTLY OR INDIRECTLY, ARISING FROM THE USE OF THIS SPECIFICATION.

Public contributions, comments and questions can be posted here: [www.1edtech.org/forums/1edtech-public-forums-and-resources](https://www.imsglobal.org/forums/ims-glc-public-forums-and-resources).

© 2025 1EdTechConsortium, Inc.  
All Rights Reserved.

Trademark information: [http://www.1edtech.org/copyright.html](http://www.imsglobal.org/copyright.html)

Document Name: 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1

Revision: 24th January, 2025

[toc](#toc) | [top](#top)

* * *

Abstract
--------

The Competencies and Academic Standards Exchange® (CASE®) Service standard facilitates the exchange of information about learning outcomes, competencies, and skills. By implementing CASE, it is possible to electronically exchange outcomes, skills, and competency definitions so applications, tools, and platforms can access the data so educators can act upon this data The key aim is to replace the current ways of documenting a learning standard and competency, typically a PDF or HTML document, by one which is machine readable both syntactically and semantically. Further, by using this new standard it will be possible to electronically exchange these definitions so that applications, systems and tools can readily access this data.

This document contains the specification of a new version of the CASE standard i.e. CASE 1.1. There has been no change to the set of service operations. The changes in CASE 1.1 are all related to the data model with the addition of several new properties and support for extensibility. The data exchange is described in an implementation-independent format i.e. using the 1EdTech model driven specification profile of the Unified Modeling Language (UML). The service description includes the definition of the data formats that are exchanged using a set of service operations.

[toc](#toc) | [top](#top)

* * *

Table of Contents
-----------------

[Abstract](#Abstract)

1\. [Introduction](#Main1)

1.1 [Scope and Context](#Main1p1)

1.2 [Conventions](#Main1p2)

1.3 [Differences Between Version 1.0 and Version 1.1](#Main1p3)

1.4 [Structure of this Document](#Main1p4)

1.5 [Nomenclature](#Main1p5)

2\. [The Use-cases](#Main2)

2.1 [Use-case 1 (Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme)](#Main2p1)

2.2 [Use-case 2 (Obtaining an Academic Standard or Competency Definition)](#Main2p2)

2.3 [Use-case 3 (Obtaining a Rubric Definition)](#Main2p3)

2.4 [Use-case 4 (Obtaining the Associations between Academic Standards/Competency/Rubric Definitions)](#Main2p4)

2.5 [Use-case 5 (Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme)](#Main2p5)

3\. [The Conceptual Model](#Main3)

3.1 [The Information to be Exchanged](#Main3p1)

3.2 [Logical Data Model](#Main3p2)

3.3 [Package Structure](#Main3p3)

3.4 [Interoperability Model](#Main3p4)

4\. [Service Architecture and Specification Model](#Main4)

4.1 [An Abstract Representation](#Main4p1)

4.2 [Service Architecture and Specification Model](#Main4p2)

4.3 [Service Objects](#Main4p3)

4.4 [A Synchronous Service](#Main4p4)

5\. [The Behavior Model](#Main5)

5.1 [Service Definition](#Behavior_1)

5.2 ["AssociationsManager" Interface Description](#Behavior_AssociationsManager)

5.2.1 ["getCFItemAssociations" Operation](#getCFItemAssociationsOperation)

5.2.2 ["getCFAssociation" Operation](#getCFAssociationOperation)

5.3 ["DefinitionsManager" Interface Description](#Behavior_DefinitionsManager)

5.3.1 ["getCFConcept" Operation](#getCFConceptOperation)

5.3.2 ["getCFSubject" Operation](#getCFSubjectOperation)

5.3.3 ["getCFLicense" Operation](#getCFLicenseOperation)

5.3.4 ["getCFItemType" Operation](#getCFItemTypeOperation)

5.3.5 ["getCFAssociationGrouping" Operation](#getCFAssociationGroupingOperation)

5.4 ["DocumentsManager" Interface Description](#Behavior_DocumentsManager)

5.4.1 ["getAllCFDocuments" Operation](#getAllCFDocumentsOperation)

5.4.2 ["getCFDocument" Operation](#getCFDocumentOperation)

5.5 ["ItemsManager" Interface Description](#Behavior_ItemsManager)

5.5.1 ["getCFItem" Operation](#getCFItemOperation)

5.6 ["PackagesManager" Interface Description](#Behavior_PackagesManager)

5.6.1 ["getCFPackage" Operation](#getCFPackageOperation)

5.7 ["RubricsManager" Interface Description](#Behavior_RubricsManager)

5.7.1 ["getCFRubric" Operation](#getCFRubricOperation)

6\. [The Interface Model](#Main6)

6.1 ["CFAssociation" Class Description](#Interface_CFAssociation)

6.1.1 ["CFDocumentURI" Attribute Description](#InterfaceAttribute_CFAssociation_CFDocumentURI)

6.2 ["CFAssociationGrouping" Class Description](#Interface_CFAssociationGrouping)

6.2.1 ["identifier" Attribute Description](#InterfaceAttribute_CFAssociationGrouping_identifier)

6.2.2 ["uri" Attribute Description](#InterfaceAttribute_CFAssociationGrouping_uri)

6.2.3 ["title" Attribute Description](#InterfaceAttribute_CFAssociationGrouping_title)

6.2.4 ["description" Attribute Description](#InterfaceAttribute_CFAssociationGrouping_description)

6.2.5 ["lastChangeDateTime" Attribute Description](#InterfaceAttribute_CFAssociationGrouping_lastChangeDateTime)

6.2.6 ["extensions" Attribute Description](#InterfaceAttribute_CFAssociationGrouping_extensions)

6.3 ["CFAssociationSet" Class Description](#Interface_CFAssociationSet)

6.3.1 ["CFItem" Attribute Description](#InterfaceAttribute_CFAssociationSet_CFItem)

6.3.2 ["CFAssociations" Attribute Description](#InterfaceAttribute_CFAssociationSet_CFAssociations)

6.4 ["CFConceptSet" Class Description](#Interface_CFConceptSet)

6.4.1 ["CFConcepts" Attribute Description](#InterfaceAttribute_CFConceptSet_CFConcepts)

6.5 ["CFDocument" Class Description](#Interface_CFDocument)

6.5.1 ["CFPackageURI" Attribute Description](#InterfaceAttribute_CFDocument_CFPackageURI)

6.6 ["CFDocumentSet" Class Description](#Interface_CFDocumentSet)

6.6.1 ["CFDocuments" Attribute Description](#InterfaceAttribute_CFDocumentSet_CFDocuments)

6.7 ["CFItem" Class Description](#Interface_CFItem)

6.7.1 ["CFDocumentURI" Attribute Description](#InterfaceAttribute_CFItem_CFDocumentURI)

6.8 ["CFItemTypeSet" Class Description](#Interface_CFItemTypeSet)

6.8.1 ["CFItemTypes" Attribute Description](#InterfaceAttribute_CFItemTypeSet_CFItemTypes)

6.9 ["CFLicense" Class Description](#Interface_CFLicense)

6.9.1 ["identifier" Attribute Description](#InterfaceAttribute_CFLicense_identifier)

6.9.2 ["uri" Attribute Description](#InterfaceAttribute_CFLicense_uri)

6.9.3 ["title" Attribute Description](#InterfaceAttribute_CFLicense_title)

6.9.4 ["description" Attribute Description](#InterfaceAttribute_CFLicense_description)

6.9.5 ["licenseText" Attribute Description](#InterfaceAttribute_CFLicense_licenseText)

6.9.6 ["lastChangeDateTime" Attribute Description](#InterfaceAttribute_CFLicense_lastChangeDateTime)

6.9.7 ["extensions" Attribute Description](#InterfaceAttribute_CFLicense_extensions)

6.10 ["CFPackage" Class Description](#Interface_CFPackage)

6.10.1 ["CFDocument" Attribute Description](#InterfaceAttribute_CFPackage_CFDocument)

6.10.2 ["CFItems" Attribute Description](#InterfaceAttribute_CFPackage_CFItems)

6.10.3 ["CFAssociations" Attribute Description](#InterfaceAttribute_CFPackage_CFAssociations)

6.10.4 ["CFDefinitions" Attribute Description](#InterfaceAttribute_CFPackage_CFDefinitions)

6.10.5 ["CFRubrics" Attribute Description](#InterfaceAttribute_CFPackage_CFRubrics)

6.10.6 ["extensions" Attribute Description](#InterfaceAttribute_CFPackage_extensions)

6.11 ["CFRubric" Class Description](#Interface_CFRubric)

6.11.1 ["identifier" Attribute Description](#InterfaceAttribute_CFRubric_identifier)

6.11.2 ["uri" Attribute Description](#InterfaceAttribute_CFRubric_uri)

6.11.3 ["title" Attribute Description](#InterfaceAttribute_CFRubric_title)

6.11.4 ["description" Attribute Description](#InterfaceAttribute_CFRubric_description)

6.11.5 ["lastChangeDateTime" Attribute Description](#InterfaceAttribute_CFRubric_lastChangeDateTime)

6.11.6 ["CFRubricCriteria" Attribute Description](#InterfaceAttribute_CFRubric_CFRubricCriteria)

6.11.7 ["extensions" Attribute Description](#InterfaceAttribute_CFRubric_extensions)

6.12 ["CFSubjectSet" Class Description](#Interface_CFSubjectSet)

6.12.1 ["CFSubjects" Attribute Description](#InterfaceAttribute_CFSubjectSet_CFSubjects)

6.13 ["UUID" Class Description](#Interface_UUID)

6.13.1 ["pattern" Attribute Description](#InterfaceAttribute_UUID_pattern)

6.14 ["imsx\_StatusInfo" Class Description](#Interface_imsx_StatusInfo)

6.14.1 ["imsx\_codeMajor" Attribute Description](#InterfaceAttribute_imsx_StatusInfo_imsx_codeMajor)

6.14.2 ["imsx\_severity" Attribute Description](#InterfaceAttribute_imsx_StatusInfo_imsx_severity)

6.14.3 ["imsx\_description" Attribute Description](#InterfaceAttribute_imsx_StatusInfo_imsx_description)

6.14.4 ["imsx\_codeMinor" Attribute Description](#InterfaceAttribute_imsx_StatusInfo_imsx_codeMinor)

7\. [Data Model](#Main7)

7.1 [Data Class Descriptions](#Data)

7.1.1 ["CFAssociation" Class Description](#Data_CFAssociation)

7.1.1.1 ["CFDocumentURI" Attribute Description](#DataAttribute_CFAssociation_CFDocumentURI)

7.1.2 ["CFAssociationExtension" Class Description](#Data_CFAssociationExtension)

7.1.2.1 ["extensions" Attribute Description](#DataAttribute_CFAssociationExtension_extensions)

7.1.3 ["CFAssociationGrouping" Class Description](#Data_CFAssociationGrouping)

7.1.3.1 ["identifier" Attribute Description](#DataAttribute_CFAssociationGrouping_identifier)

7.1.3.2 ["uri" Attribute Description](#DataAttribute_CFAssociationGrouping_uri)

7.1.3.3 ["title" Attribute Description](#DataAttribute_CFAssociationGrouping_title)

7.1.3.4 ["description" Attribute Description](#DataAttribute_CFAssociationGrouping_description)

7.1.3.5 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFAssociationGrouping_lastChangeDateTime)

7.1.3.6 ["extensions" Attribute Description](#DataAttribute_CFAssociationGrouping_extensions)

7.1.4 ["CFAssociationGroupingExtension" Class Description](#Data_CFAssociationGroupingExtension)

7.1.4.1 ["extensions" Attribute Description](#DataAttribute_CFAssociationGroupingExtension_extensions)

7.1.5 ["CFAssociationSet" Class Description](#Data_CFAssociationSet)

7.1.5.1 ["CFItem" Attribute Description](#DataAttribute_CFAssociationSet_CFItem)

7.1.5.2 ["CFAssociations" Attribute Description](#DataAttribute_CFAssociationSet_CFAssociations)

7.1.6 ["CFConcept" Class Description](#Data_CFConcept)

7.1.6.1 ["identifier" Attribute Description](#DataAttribute_CFConcept_identifier)

7.1.6.2 ["uri" Attribute Description](#DataAttribute_CFConcept_uri)

7.1.6.3 ["title" Attribute Description](#DataAttribute_CFConcept_title)

7.1.6.4 ["keywords" Attribute Description](#DataAttribute_CFConcept_keywords)

7.1.6.5 ["hierarchyCode" Attribute Description](#DataAttribute_CFConcept_hierarchyCode)

7.1.6.6 ["description" Attribute Description](#DataAttribute_CFConcept_description)

7.1.6.7 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFConcept_lastChangeDateTime)

7.1.6.8 ["extensions" Attribute Description](#DataAttribute_CFConcept_extensions)

7.1.7 ["CFConceptExtension" Class Description](#Data_CFConceptExtension)

7.1.7.1 ["extensions" Attribute Description](#DataAttribute_CFConceptExtension_extensions)

7.1.8 ["CFConceptSet" Class Description](#Data_CFConceptSet)

7.1.8.1 ["CFConcepts" Attribute Description](#DataAttribute_CFConceptSet_CFConcepts)

7.1.9 ["CFDefinition" Class Description](#Data_CFDefinition)

7.1.9.1 ["CFConcepts" Attribute Description](#DataAttribute_CFDefinition_CFConcepts)

7.1.9.2 ["CFSubjects" Attribute Description](#DataAttribute_CFDefinition_CFSubjects)

7.1.9.3 ["CFLicenses" Attribute Description](#DataAttribute_CFDefinition_CFLicenses)

7.1.9.4 ["CFItemTypes" Attribute Description](#DataAttribute_CFDefinition_CFItemTypes)

7.1.9.5 ["CFAssociationGroupings" Attribute Description](#DataAttribute_CFDefinition_CFAssociationGroupings)

7.1.9.6 ["extensions" Attribute Description](#DataAttribute_CFDefinition_extensions)

7.1.10 ["CFDefinitionExtension" Class Description](#Data_CFDefinitionExtension)

7.1.10.1 ["extensions" Attribute Description](#DataAttribute_CFDefinitionExtension_extensions)

7.1.11 ["CFDocument" Class Description](#Data_CFDocument)

7.1.11.1 ["CFPackageURI" Attribute Description](#DataAttribute_CFDocument_CFPackageURI)

7.1.12 ["CFDocumentExtension" Class Description](#Data_CFDocumentExtension)

7.1.12.1 ["extensions" Attribute Description](#DataAttribute_CFDocumentExtension_extensions)

7.1.13 ["CFDocumentSet" Class Description](#Data_CFDocumentSet)

7.1.13.1 ["CFDocuments" Attribute Description](#DataAttribute_CFDocumentSet_CFDocuments)

7.1.14 ["CFItem" Class Description](#Data_CFItem)

7.1.14.1 ["CFDocumentURI" Attribute Description](#DataAttribute_CFItem_CFDocumentURI)

7.1.15 ["CFItemExtension" Class Description](#Data_CFItemExtension)

7.1.15.1 ["extensions" Attribute Description](#DataAttribute_CFItemExtension_extensions)

7.1.16 ["CFItemType" Class Description](#Data_CFItemType)

7.1.16.1 ["identifier" Attribute Description](#DataAttribute_CFItemType_identifier)

7.1.16.2 ["uri" Attribute Description](#DataAttribute_CFItemType_uri)

7.1.16.3 ["title" Attribute Description](#DataAttribute_CFItemType_title)

7.1.16.4 ["description" Attribute Description](#DataAttribute_CFItemType_description)

7.1.16.5 ["hierarchyCode" Attribute Description](#DataAttribute_CFItemType_hierarchyCode)

7.1.16.6 ["typeCode" Attribute Description](#DataAttribute_CFItemType_typeCode)

7.1.16.7 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFItemType_lastChangeDateTime)

7.1.16.8 ["extensions" Attribute Description](#DataAttribute_CFItemType_extensions)

7.1.17 ["CFItemTypeExtension" Class Description](#Data_CFItemTypeExtension)

7.1.17.1 ["extensions" Attribute Description](#DataAttribute_CFItemTypeExtension_extensions)

7.1.18 ["CFItemTypeSet" Class Description](#Data_CFItemTypeSet)

7.1.18.1 ["CFItemTypes" Attribute Description](#DataAttribute_CFItemTypeSet_CFItemTypes)

7.1.19 ["CFLicense" Class Description](#Data_CFLicense)

7.1.19.1 ["identifier" Attribute Description](#DataAttribute_CFLicense_identifier)

7.1.19.2 ["uri" Attribute Description](#DataAttribute_CFLicense_uri)

7.1.19.3 ["title" Attribute Description](#DataAttribute_CFLicense_title)

7.1.19.4 ["description" Attribute Description](#DataAttribute_CFLicense_description)

7.1.19.5 ["licenseText" Attribute Description](#DataAttribute_CFLicense_licenseText)

7.1.19.6 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFLicense_lastChangeDateTime)

7.1.19.7 ["extensions" Attribute Description](#DataAttribute_CFLicense_extensions)

7.1.20 ["CFLicenseExtension" Class Description](#Data_CFLicenseExtension)

7.1.20.1 ["extensions" Attribute Description](#DataAttribute_CFLicenseExtension_extensions)

7.1.21 ["CFPackage" Class Description](#Data_CFPackage)

7.1.21.1 ["CFDocument" Attribute Description](#DataAttribute_CFPackage_CFDocument)

7.1.21.2 ["CFItems" Attribute Description](#DataAttribute_CFPackage_CFItems)

7.1.21.3 ["CFAssociations" Attribute Description](#DataAttribute_CFPackage_CFAssociations)

7.1.21.4 ["CFDefinitions" Attribute Description](#DataAttribute_CFPackage_CFDefinitions)

7.1.21.5 ["CFRubrics" Attribute Description](#DataAttribute_CFPackage_CFRubrics)

7.1.21.6 ["extensions" Attribute Description](#DataAttribute_CFPackage_extensions)

7.1.22 ["CFPackageExtension" Class Description](#Data_CFPackageExtension)

7.1.22.1 ["extensions" Attribute Description](#DataAttribute_CFPackageExtension_extensions)

7.1.23 ["CFPckgAssociation" Class Description](#Data_CFPckgAssociation)

7.1.23.1 ["identifier" Attribute Description](#DataAttribute_CFPckgAssociation_identifier)

7.1.23.2 ["associationType" Attribute Description](#DataAttribute_CFPckgAssociation_associationType)

7.1.23.3 ["sequenceNumber" Attribute Description](#DataAttribute_CFPckgAssociation_sequenceNumber)

7.1.23.4 ["uri" Attribute Description](#DataAttribute_CFPckgAssociation_uri)

7.1.23.5 ["originNodeURI" Attribute Description](#DataAttribute_CFPckgAssociation_originNodeURI)

7.1.23.6 ["destinationNodeURI" Attribute Description](#DataAttribute_CFPckgAssociation_destinationNodeURI)

7.1.23.7 ["CFAssociationGroupingURI" Attribute Description](#DataAttribute_CFPckgAssociation_CFAssociationGroupingURI)

7.1.23.8 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFPckgAssociation_lastChangeDateTime)

7.1.23.9 ["notes" Attribute Description](#DataAttribute_CFPckgAssociation_notes)

7.1.23.10 ["extensions" Attribute Description](#DataAttribute_CFPckgAssociation_extensions)

7.1.24 ["CFPckgDocument" Class Description](#Data_CFPckgDocument)

7.1.24.1 ["identifier" Attribute Description](#DataAttribute_CFPckgDocument_identifier)

7.1.24.2 ["uri" Attribute Description](#DataAttribute_CFPckgDocument_uri)

7.1.24.3 ["frameworkType" Attribute Description](#DataAttribute_CFPckgDocument_frameworkType)

7.1.24.4 ["caseVersion" Attribute Description](#DataAttribute_CFPckgDocument_caseVersion)

7.1.24.5 ["creator" Attribute Description](#DataAttribute_CFPckgDocument_creator)

7.1.24.6 ["title" Attribute Description](#DataAttribute_CFPckgDocument_title)

7.1.24.7 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFPckgDocument_lastChangeDateTime)

7.1.24.8 ["officialSourceURL" Attribute Description](#DataAttribute_CFPckgDocument_officialSourceURL)

7.1.24.9 ["publisher" Attribute Description](#DataAttribute_CFPckgDocument_publisher)

7.1.24.10 ["description" Attribute Description](#DataAttribute_CFPckgDocument_description)

7.1.24.11 ["subject" Attribute Description](#DataAttribute_CFPckgDocument_subject)

7.1.24.12 ["subjectURI" Attribute Description](#DataAttribute_CFPckgDocument_subjectURI)

7.1.24.13 ["language" Attribute Description](#DataAttribute_CFPckgDocument_language)

7.1.24.14 ["version" Attribute Description](#DataAttribute_CFPckgDocument_version)

7.1.24.15 ["adoptionStatus" Attribute Description](#DataAttribute_CFPckgDocument_adoptionStatus)

7.1.24.16 ["statusStartDate" Attribute Description](#DataAttribute_CFPckgDocument_statusStartDate)

7.1.24.17 ["statusEndDate" Attribute Description](#DataAttribute_CFPckgDocument_statusEndDate)

7.1.24.18 ["licenseURI" Attribute Description](#DataAttribute_CFPckgDocument_licenseURI)

7.1.24.19 ["notes" Attribute Description](#DataAttribute_CFPckgDocument_notes)

7.1.24.20 ["extensions" Attribute Description](#DataAttribute_CFPckgDocument_extensions)

7.1.25 ["CFPckgItem" Class Description](#Data_CFPckgItem)

7.1.25.1 ["identifier" Attribute Description](#DataAttribute_CFPckgItem_identifier)

7.1.25.2 ["fullStatement" Attribute Description](#DataAttribute_CFPckgItem_fullStatement)

7.1.25.3 ["alternativeLabel" Attribute Description](#DataAttribute_CFPckgItem_alternativeLabel)

7.1.25.4 ["CFItemType" Attribute Description](#DataAttribute_CFPckgItem_CFItemType)

7.1.25.5 ["uri" Attribute Description](#DataAttribute_CFPckgItem_uri)

7.1.25.6 ["humanCodingScheme" Attribute Description](#DataAttribute_CFPckgItem_humanCodingScheme)

7.1.25.7 ["listEnumeration" Attribute Description](#DataAttribute_CFPckgItem_listEnumeration)

7.1.25.8 ["abbreviatedStatement" Attribute Description](#DataAttribute_CFPckgItem_abbreviatedStatement)

7.1.25.9 ["conceptKeywords" Attribute Description](#DataAttribute_CFPckgItem_conceptKeywords)

7.1.25.10 ["conceptKeywordsURI" Attribute Description](#DataAttribute_CFPckgItem_conceptKeywordsURI)

7.1.25.11 ["notes" Attribute Description](#DataAttribute_CFPckgItem_notes)

7.1.25.12 ["subject" Attribute Description](#DataAttribute_CFPckgItem_subject)

7.1.25.13 ["subjectURI" Attribute Description](#DataAttribute_CFPckgItem_subjectURI)

7.1.25.14 ["language" Attribute Description](#DataAttribute_CFPckgItem_language)

7.1.25.15 ["educationLevel" Attribute Description](#DataAttribute_CFPckgItem_educationLevel)

7.1.25.16 ["CFItemTypeURI" Attribute Description](#DataAttribute_CFPckgItem_CFItemTypeURI)

7.1.25.17 ["licenseURI" Attribute Description](#DataAttribute_CFPckgItem_licenseURI)

7.1.25.18 ["statusStartDate" Attribute Description](#DataAttribute_CFPckgItem_statusStartDate)

7.1.25.19 ["statusEndDate" Attribute Description](#DataAttribute_CFPckgItem_statusEndDate)

7.1.25.20 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFPckgItem_lastChangeDateTime)

7.1.25.21 ["extensions" Attribute Description](#DataAttribute_CFPckgItem_extensions)

7.1.26 ["CFRubric" Class Description](#Data_CFRubric)

7.1.26.1 ["identifier" Attribute Description](#DataAttribute_CFRubric_identifier)

7.1.26.2 ["uri" Attribute Description](#DataAttribute_CFRubric_uri)

7.1.26.3 ["title" Attribute Description](#DataAttribute_CFRubric_title)

7.1.26.4 ["description" Attribute Description](#DataAttribute_CFRubric_description)

7.1.26.5 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFRubric_lastChangeDateTime)

7.1.26.6 ["CFRubricCriteria" Attribute Description](#DataAttribute_CFRubric_CFRubricCriteria)

7.1.26.7 ["extensions" Attribute Description](#DataAttribute_CFRubric_extensions)

7.1.27 ["CFRubricCriterion" Class Description](#Data_CFRubricCriterion)

7.1.27.1 ["identifier" Attribute Description](#DataAttribute_CFRubricCriterion_identifier)

7.1.27.2 ["uri" Attribute Description](#DataAttribute_CFRubricCriterion_uri)

7.1.27.3 ["category" Attribute Description](#DataAttribute_CFRubricCriterion_category)

7.1.27.4 ["description" Attribute Description](#DataAttribute_CFRubricCriterion_description)

7.1.27.5 ["CFItemURI" Attribute Description](#DataAttribute_CFRubricCriterion_CFItemURI)

7.1.27.6 ["weight" Attribute Description](#DataAttribute_CFRubricCriterion_weight)

7.1.27.7 ["position" Attribute Description](#DataAttribute_CFRubricCriterion_position)

7.1.27.8 ["rubricId" Attribute Description](#DataAttribute_CFRubricCriterion_rubricId)

7.1.27.9 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFRubricCriterion_lastChangeDateTime)

7.1.27.10 ["CFRubricCriterionLevels" Attribute Description](#DataAttribute_CFRubricCriterion_CFRubricCriterionLevels)

7.1.27.11 ["extensions" Attribute Description](#DataAttribute_CFRubricCriterion_extensions)

7.1.28 ["CFRubricCriterionExtension" Class Description](#Data_CFRubricCriterionExtension)

7.1.28.1 ["extensions" Attribute Description](#DataAttribute_CFRubricCriterionExtension_extensions)

7.1.29 ["CFRubricCriterionLevel" Class Description](#Data_CFRubricCriterionLevel)

7.1.29.1 ["identifier" Attribute Description](#DataAttribute_CFRubricCriterionLevel_identifier)

7.1.29.2 ["uri" Attribute Description](#DataAttribute_CFRubricCriterionLevel_uri)

7.1.29.3 ["description" Attribute Description](#DataAttribute_CFRubricCriterionLevel_description)

7.1.29.4 ["quality" Attribute Description](#DataAttribute_CFRubricCriterionLevel_quality)

7.1.29.5 ["score" Attribute Description](#DataAttribute_CFRubricCriterionLevel_score)

7.1.29.6 ["feedback" Attribute Description](#DataAttribute_CFRubricCriterionLevel_feedback)

7.1.29.7 ["position" Attribute Description](#DataAttribute_CFRubricCriterionLevel_position)

7.1.29.8 ["rubricCriterionId" Attribute Description](#DataAttribute_CFRubricCriterionLevel_rubricCriterionId)

7.1.29.9 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFRubricCriterionLevel_lastChangeDateTime)

7.1.29.10 ["extensions" Attribute Description](#DataAttribute_CFRubricCriterionLevel_extensions)

7.1.30 ["CFRubricCriterionLevelExtension" Class Description](#Data_CFRubricCriterionLevelExtension)

7.1.30.1 ["extensions" Attribute Description](#DataAttribute_CFRubricCriterionLevelExtension_extensions)

7.1.31 ["CFRubricExtension" Class Description](#Data_CFRubricExtension)

7.1.31.1 ["extensions" Attribute Description](#DataAttribute_CFRubricExtension_extensions)

7.1.32 ["CFSubject" Class Description](#Data_CFSubject)

7.1.32.1 ["identifier" Attribute Description](#DataAttribute_CFSubject_identifier)

7.1.32.2 ["uri" Attribute Description](#DataAttribute_CFSubject_uri)

7.1.32.3 ["title" Attribute Description](#DataAttribute_CFSubject_title)

7.1.32.4 ["hierarchyCode" Attribute Description](#DataAttribute_CFSubject_hierarchyCode)

7.1.32.5 ["description" Attribute Description](#DataAttribute_CFSubject_description)

7.1.32.6 ["lastChangeDateTime" Attribute Description](#DataAttribute_CFSubject_lastChangeDateTime)

7.1.32.7 ["extensions" Attribute Description](#DataAttribute_CFSubject_extensions)

7.1.33 ["CFSubjectExtension" Class Description](#Data_CFSubjectExtension)

7.1.33.1 ["extensions" Attribute Description](#DataAttribute_CFSubjectExtension_extensions)

7.1.34 ["CFSubjectSet" Class Description](#Data_CFSubjectSet)

7.1.34.1 ["CFSubjects" Attribute Description](#DataAttribute_CFSubjectSet_CFSubjects)

7.1.35 ["LinkGenURI" Class Description](#Data_LinkGenURI)

7.1.35.1 ["title" Attribute Description](#DataAttribute_LinkGenURI_title)

7.1.35.2 ["identifier" Attribute Description](#DataAttribute_LinkGenURI_identifier)

7.1.35.3 ["uri" Attribute Description](#DataAttribute_LinkGenURI_uri)

7.1.35.4 ["targetType" Attribute Description](#DataAttribute_LinkGenURI_targetType)

7.1.36 ["LinkURI" Class Description](#Data_LinkURI)

7.1.36.1 ["title" Attribute Description](#DataAttribute_LinkURI_title)

7.1.36.2 ["identifier" Attribute Description](#DataAttribute_LinkURI_identifier)

7.1.36.3 ["uri" Attribute Description](#DataAttribute_LinkURI_uri)

7.1.37 ["imsx\_CodeMinor" Class Description](#Data_imsx_CodeMinor)

7.1.37.1 ["imsx\_codeMinorField" Attribute Description](#DataAttribute_imsx_CodeMinor_imsx_codeMinorField)

7.1.38 ["imsx\_CodeMinorField" Class Description](#Data_imsx_CodeMinorField)

7.1.38.1 ["imsx\_codeMinorFieldName" Attribute Description](#DataAttribute_imsx_CodeMinorField_imsx_codeMinorFieldName)

7.1.38.2 ["imsx\_codeMinorFieldValue" Attribute Description](#DataAttribute_imsx_CodeMinorField_imsx_codeMinorFieldValue)

7.1.39 ["imsx\_StatusInfo" Class Description](#Data_imsx_StatusInfo)

7.1.39.1 ["imsx\_codeMajor" Attribute Description](#DataAttribute_imsx_StatusInfo_imsx_codeMajor)

7.1.39.2 ["imsx\_severity" Attribute Description](#DataAttribute_imsx_StatusInfo_imsx_severity)

7.1.39.3 ["imsx\_description" Attribute Description](#DataAttribute_imsx_StatusInfo_imsx_description)

7.1.39.4 ["imsx\_codeMinor" Attribute Description](#DataAttribute_imsx_StatusInfo_imsx_codeMinor)

7.2 [Derived Class Descriptions](#Derived)

7.2.1 ["EnumExtString" Class Description](#Derived_EnumExtString)

7.2.1.1 ["pattern" Attribute Description](#DerivedAttribute_EnumExtString_pattern)

7.2.2 ["URL" Class Description](#Derived_URL)

7.2.3 ["UUID" Class Description](#Derived_UUID)

7.2.3.1 ["pattern" Attribute Description](#DerivedAttribute_UUID_pattern)

7.3 [Union Class Descriptions](#Union)

7.3.1 ["CFAssociationTypeExtEnum" Class Description](#Union_CFAssociationTypeExtEnum)

7.3.2 ["TargetTypeExtEnum" Class Description](#Union_TargetTypeExtEnum)

7.4 [Enumerated Vocabulary Descriptions](#Enumerated)

7.4.1 ["CFAssociationTypeEnum" Vocabulary Description](#Enumerated_CFAssociationTypeEnum)

7.4.2 ["CaseVersionEnum" Vocabulary Description](#Enumerated_CaseVersionEnum)

7.4.3 ["TargetTypeEnum" Vocabulary Description](#Enumerated_TargetTypeEnum)

7.4.4 ["imsx\_CodeMajorEnum" Vocabulary Description](#Enumerated_imsx_CodeMajorEnum)

7.4.5 ["imsx\_CodeMinorValueEnum" Vocabulary Description](#Enumerated_imsx_CodeMinorValueEnum)

7.4.6 ["imsx\_SeverityEnum" Vocabulary Description](#Enumerated_imsx_SeverityEnum)

8\. [Data Privacy Implications](#Main8)

9\. [Link Data Definitions](#Main9)

9.1 [CFDocument Link Data Description](#LinkDataClass_CFDocument)

9.2 [CFItem Link Data Description](#LinkDataClass_CFItem)

9.3 [CFPackage Link Data Description](#LinkDataClass_CFPackage)

9.4 [CFRubric Link Data Description](#LinkDataClass_CFRubric)

9.5 [CFRubricCriterion Link Data Description](#LinkDataClass_CFRubricCriterion)

10\. [Extending and Profiling the Service](#Main10)

10.1 [Extending the Service](#Extend)

10.1.1 [Proprietary Operations](#Extendp1)

10.1.2 [Proprietary Data Elements](#Extendp2)

10.2 [Profiling the Service](#Profile)

[References](#References)

Appendix A [Modelling Concepts and Terms](#AppA)

Appendix B [Service Status Codes](#AppB)

[About this Document](#AtD)

[List of Contributors](#LoC)

[Revision History](#Revision)

[toc](#toc) | [top](#top)

* * *

List of Figures
---------------

[toc](#toc) | [top](#top)

* * *

List of Tables
--------------

[toc](#toc) | [top](#top)

* * *

1\. Introduction
----------------

This Section is NOT NORMATIVE.

1.1. Scope and Context
----------------------

This document is the Competencies and Academic Standards Exchange (CASE) Service Model v1.0 and as such it is used as the basis for the development of the following documents:

*   1EdTech Competencies and Academic Standards Exchange (CASE) REST/JSON Binding v1.0 [\[CASE-BIND-11\]](#Ref_CASE-BIND-11) - the description of the REST/JSON binding, including the OpenAPI description, of the Information Model;
*   1EdTech Competencies and Academic Standards Exchange (CASE) Conformance and Certification v1.0 [\[CASE-CERT-11\]](#Ref_CASE-CERT-11) - the conformance guidelines for achieving CASE certification.

This information model defines the CASE Abstract Application Programming Interface (a-API). This service model is described using the Unified Modeling Language (UML) based upon the 1EdTech Model Driven Specification approach and the associated modelling toolkit [\[I-BAT, 06\]](#Ref_I-BAT06). This means that this specification is based upon the concepts of:

*   Interoperability - the CASE service focuses on the exchange of learning standards and competencies definitions. There are no definitions in the specification on how the data is managed within the end-systems;
*   Service-oriented - the CASE service specification defines the exchange of information in terms of the services being supplied by the collaboration of the systems;
*   Behaviors and Data Models - the CASE service is defined in terms of their behaviors and data models. The behaviors cause changes in the state of the data model and the state of the data model will only be altered as a result of a clearly defined behavior;
*   Multiple Bindings - the CASE service information model is defined using the Unified Modeling Language (UML). This enables reliable mapping of the information model into a range of different bindings. The bindings of immediate importance are to REST/JSON and JSON-Linked Data;
*   Adoption - whenever appropriate, the CASE specification makes use of other 1EdTech and non-1EdTech standards and specifications.

1.2. Conventions
----------------

All sections marked as non-normative, all authoring guidelines, diagrams (with the exception of the UML diagrams), examples, and notes in this specification are non-normative. Everything else in this specification is normative.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [\[RFC 2119\]](#Ref_RFC2119). This means that from the perspective of conformance:

*   1EdTech considers nonconformant any implementation of this specification that fails to implement a MUST/REQUIRED/SHALL requirement or fails to abide by a MUST NOT/SHALL NOT prohibition;
*   SHOULD/SHOULD NOT/RECOMMENDED statements constitute a best practice; ignoring a best practice does not violate conformance but implementers should carefully consider a decision to disregard such guidance;
*   MAY/OPTIONAL statements indicate that implementers are entirely free to choose whether or not to implement the option.

The Conformance and Certification Guide for this specification may introduce greater normative constraints than those defined here for specific service or implementation categories.

The SHOULD/SHOULD NOT/RECOMMENDED statements MUST NOT be used in any document, or section of a document, that is responsible for defining the information model and/or the associated bindings and/or conformance and certification.

1.3. Differences Between Version 1.0 and Version 1.1
----------------------------------------------------

The list of differences between versions 1.0 and 1.1 is:

*   The attribute 'frameworkType' has been added to the 'CFDocument' class - it is used to enable the type of framework to be defined/identified;
*   The attribute 'caseVersion' has been added to the 'CFDocument' class - if present this MUST be set as '1.1';
*   The attribute 'subject' has been added to the 'CFItem' class - to annotate the CFItem with the associated subject coverage;
*   The attribute 'subjectURI' has been added to the 'CFItem' class - the set of URI links for the associated set of subjects;
*   The attribute 'notes' has been added to the 'CFAssociation' class - human readable notes describing the association;
*   The attribute 'targetType' has been added to 'LinkGenURI' class - allows the origin and destination nodes to be annotated with the type of association at the node. This is defined as an extensible enumerated vocabulary;
*   The token value 'isTranslationOf' has been added to the enumerated vocabulary for the 'associationType' attribute for the 'CFAssociation' class;
*   The data-type for the attribute 'fullStatement' in the 'CFItem' class has been changed from 'NormalizedString' to 'String' to enable the insertion of markup-based text;
*   The data-type for the attribute 'description' in the 'CFDocument' class has been changed from 'NormalizedString' to 'String' to enable the insertion of markup-based text;
*   The data-type for the attribute 'description' in the 'CFRubric' class has been changed from 'NormalizedString' to 'String' to enable the insertion of markup-based text;
*   Support for extensibility has been added to the following classes:-
    *   CFAssociation
    *   CFAssociationGrouping
    *   CFConcept
    *   CFDefinition
    *   CFDocument
    *   CFItem
    *   CFItemType
    *   CFLicense
    *   CFPackage
    *   CFRubric
    *   CFRubricCriterion
    *   CFRubricCriterionLevel
    *   CFSubject.

1.4. Structure of this Document
-------------------------------

The structure of the rest of this document is:



* 2. The Use-cases: 3. The Conceptual Model
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: The underlying conceptual data model and the set of relationships between the various learning standard and competency components. This includes schematic visualizations that are not based upon UML;
* 2. The Use-cases: 4. Service Architecture and Specification Model
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: An overview of the service including the key use-cases and the underlying service architecture and end-system service objects;
* 2. The Use-cases: 5. The Behavior Model
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: The definition of the operations of the service. This focuses on the description of the behaviors supported by the service. The behaviors are group as interfaces;
* 2. The Use-cases: 6. The Interface Model
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: The definition of the data models exchanged between the service End Systems. These are the parameters exchanged across the interoperability interface. These are an abbreviated description with the full set of details in the corresponding data class description;
* 2. The Use-cases: 7. Data Model
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: The definition of the data classes for the full data exchange. This addresses the data classes used to supplement the interface parameters. The descriptions are grouped according to their type e.g. data, enumeration, derived, etc.
* 2. The Use-cases: 8. Data Privacy Implications
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: Identification of the set of classes and their set of properties that MAY contain information that has privacy or privacy-related implications. Each property is identified in terms of the type of privacy;
* 2. The Use-cases: 9. Link Data Definitions
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: The set of descriptions for the link data definitions that are used to establish the intra- and inter- specification relationships;
* 2. The Use-cases: 10. Extending and Profiling the Service
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: An explanation of how the service can be extended, using the permitted points of extension and/or profiled. Profiling is the process by which the specification is tailored to a specific set of market/domain requirements;
* 2. The Use-cases:  References
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: The set of cited documents, normative and informative, that are used to support the technical details in this document;
* 2. The Use-cases: Appendix A Modelling Concepts and Terms
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: An overview of the model driven approach, the concepts and the terms used by 1EdTech to create the service model representations (based upon a profile of UML), the corresponding set of bindings and the accompanying documentation (including this information model);
* 2. The Use-cases: Appendix B Service Status Codes
  * The set of core use-cases supported by this specification. This includes the exchange of machine readable learning standards for Schools (K-12) and machine readable competency definitions for Higher Education (HE);: A summary list of the status codes, and their causes, that can be returned by each of the operations forming the service. These describe the end-to-end status of the transaction.


1.5. Nomenclature
-----------------



* A-API: API
  * Abstract API: Application Programming Interface
* A-API: CASE
  * Abstract API: Competencies and Academic Standards Exchange
* A-API: CBE
  * Abstract API: Competency Based Education
* A-API: Competency Framework
  * Abstract API: A set of statements created by and articulating skills and/or specific knowledge.  
* A-API: Competency Framework Association
  * Abstract API: A relationship between two Competency Framework Documents or two Competency Framework Items (the associations are defined using a set of predefined vocabulary).
* A-API: Competency Framework Association Grouping
  * Abstract API: This is a set of associations that have been grouped together because they have some important relationship(s). One usage would be in identifying the set of cross-walk associations to other documents. 
* A-API: Competency Framework Document
  * Abstract API: A document that acts as a container for a collection of learning standard items, typically arranged in a hierarchical structure or classification scheme, reflecting expectations of learner competencies within a single subject area covering one or more levels.
* A-API: Competency Framework Item
  * Abstract API: Content that either describes a specific competency (learning objective) or describes a grouping of competencies within the taxonomy of a Competency Framework Document. Educational standards are the learning goals for what students should know and be able to do at each grade level. Education standards, like Common Core are not a curriculum. Local communities and educators choose their own curriculum, which is a detailed plan for day-to-day teaching. In other words, the Common Core is what students need to know and be able to do, and curriculum is how students will learn it. The Common Core State Standards are educational standards for English language arts (ELA)/literacy and mathematics in grades K-12. 
* A-API: Competency Framework Package
  * Abstract API: A set of Competency Framework Document, Competency Framework Items and Competency Framework Associations released by a standard setting entity
* A-API: Competency Framework Rubric
  * Abstract API: An entity that includes information about an instrument used to communicate expectations of quality around a task, product, or performance and/or used to delineate consistent criteria for grading. A CFRubric is defined by a set of CFRubricCriterion. 
* A-API: Competency Framework Rubric Criterion
  * Abstract API: An entity that defines a specific performance criterion. A CFRubricCriterion is defined by a set of CFRubricCriterionLevels. 
* A-API: Competency Framework Rubric Criterion Level
  * Abstract API: An entity that defines a specific performance criterion level for a rubric. Each level must have a distinct performance value. 
* A-API: GUID
  * Abstract API: Globally Unique Identifier (this may or may not also be a UUID)
* A-API: HE
  * Abstract API: Higher Education
* A-API: IETF
  * Abstract API: Internet Engineering Task Force
* A-API: ISO
  * Abstract API: International Standards Organization
* A-API: JSON
  * Abstract API: Java Script Object Notation
* A-API: LMS
  * Abstract API: Learning Management System
* A-API: REST
  * Abstract API: Representation State Transfer
* A-API: RFC
  * Abstract API: Request for Comments
* A-API: UML
  * Abstract API: Unified Modelling Language
* A-API: URI
  * Abstract API: Uniform Resource Identifier
* A-API: URL
  * Abstract API: Uniform Resource Locator
* A-API: UUID
  * Abstract API: Universally Unique Identifier
* A-API: VDEX
  * Abstract API: Vocabulary Definition and Exchange
* A-API: XML
  * Abstract API: Exchange Markup Language
* A-API: XSD
  * Abstract API: XML Schema Definition


[toc](#toc) | [top](#top)

* * *

2\. The Use-cases
-----------------

The set of uses cases that can be supported by the usage of the CASE service are:

*   Obtaining the definition of the academic standards/competencies/rubrics for a module, course or programme;
*   Obtaining an academic standard or competency definition;
*   Obtaining a rubric definition;
*   Obtaining the associations between academic standards/competency/rubric definitions;
*   Obtaining all of the detailed definitions of the academic standards/competencies/rubrics for a module, course or programme.

2.1. Use-case 1 (Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme)
---------------------------------------------------------------------------------------------------------------------------

The summary description for this use-case is given in Table 2.1.


Table 2.1 Obtaining the definition of the academic standards/competencies/rubrics for a module, course or programme use-case.


* Title:: Local ID:
  * Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: CASE-01
* Title:: Description:
  * Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: A teacher wishes to obtain the definition of a competency/academic standard for a key learning structure e.g. a course, a programme, etc. A detailed example is that a teacher needs to review the definition for a subject e.g. Year 11 French. Therefore the institution's LMS must have obtained this breakdown for the corresponding District Learning Standards definitions repository. The teacher can then review the subject definition through the institution's LMS.
* Title:: Level
  * Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: Summary
* Title:: Actors:
  * Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: Primary - Learning Management System (Institution) and Competency/Academic Standard Repository (District)          Secondary - Teacher
* Title:: Stakeholder:
  * Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: Teaching Institution e.g. School
* Title:: Interest:
  * Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: It is essential that the set of competency/academic standard definitions for the education to be supplied and against which the student will be measured are available electronically and installed in the institution's Learning Management System (LMS).
* Title:: Notes:
  * Obtaining the Definition of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: In terms of the CASE specification, the LMS must have obtained the appropriate CFDocument description(s). The teacher does not need to be aware of how the LMS has obtained the definitions, merely that they are available and assured that they are consistent with the definitions supplied by the District.


2.2. Use-case 2 (Obtaining an Academic Standard or Competency Definition)
-------------------------------------------------------------------------

The summary description for this use-case is given in Table 2.2.


Table 2.2 Obtaining an academic standard or competency definition use-case.


* Title:: Local ID:
  * Obtaining an Academic Standard or Competency Definition: CASE-02
* Title:: Description:
  * Obtaining an Academic Standard or Competency Definition: A teacher wishes to obtain the detailed statements for a competency/academic standard for a key learning structure e.g. a course. A detailed example is that a teacher needs to understand the specific learning objectives that must be achieved for a subject e.g. Year 10 Biology - The Carbon Cycle. Therefore the institution's LMS must have obtained these statements from the corresponding District Learning Standards definitions repository. The teacher can then review the subject statements through the institution's LMS.
* Title:: Level
  * Obtaining an Academic Standard or Competency Definition: Summary
* Title:: Actors:
  * Obtaining an Academic Standard or Competency Definition: Primary - Learning Management System (Institution) and Competency/Academic Standard Repository (District)          Secondary - Teacher
* Title:: Stakeholder:
  * Obtaining an Academic Standard or Competency Definition: Teaching Institution e.g. School
* Title:: Interest:
  * Obtaining an Academic Standard or Competency Definition: It is essential that the set of competency/academic standard statements for the education to be supplied and against which the student will be measured are available electronically and installed in the institution's Learning Management System (LMS).
* Title:: Notes:
  * Obtaining an Academic Standard or Competency Definition: In terms of the CASE specification, the LMS must have obtained the appropriate CFItem descriptions. The teacher does not need to be aware of how the LMS has obtained the definitions, merely that they are available and assured that they are consistent with the definitions supplied by the District.


2.3. Use-case 3 (Obtaining a Rubric Definition)
-----------------------------------------------

The summary description for this use-case is given in Table 2.3.


Table 2.3 Obtaining a rubric definition use-case.


* Title:: Local ID:
  * Obtaining a Rubric Definition: CASE-03
* Title:: Description:
  * Obtaining a Rubric Definition: A faculty member wishes to obtain the rubrics which define the assessment marking schemes to be applied to the set of learning activities they are teaching. A detailed example is that the faculty member needs to read the marking scheme required for marking an essay on the use of resonance in electrical circuits. Therefore the institution's LMS must have obtained these rubrics from the Institutions content repository that is used to store the rubrics (the rubric may have been created by a separate curriculum development team). The faculty member can then review the rubrics through the institution's LMS.
* Title:: Level
  * Obtaining a Rubric Definition: Summary
* Title:: Actors:
  * Obtaining a Rubric Definition: Primary - Learning Management System (Institution) and Rubrics Repository (Institution)          Secondary - Faculty Member
* Title:: Stakeholder:
  * Obtaining a Rubric Definition: Higher Education Institution e.g. University
* Title:: Interest:
  * Obtaining a Rubric Definition: It is essential that the set of rubrics for the assessment of the various learning activities are available electronically and installed in the institution's Learning Management System (LMS).
* Title:: Notes:
  * Obtaining a Rubric Definition: In terms of the CASE specification, the LMS must have obtained the appropriate CFRubric description (this will include the associated CFRubricCriteria and CFRubricCriterionLevels descriptions).


2.4. Use-case 4 (Obtaining the Associations between Academic Standards/Competency/Rubric Definitions)
-----------------------------------------------------------------------------------------------------

The summary description for this use-case is given in Table 2.4.


Table 2.4 Obtaining the associations between academic standards/competency/rubric definitions use-case.


* Title:: Local ID:
  * Obtaining the Associations between Academic Standards/Competency/Rubric Definitions: CASE-04
* Title:: Description:
  * Obtaining the Associations between Academic Standards/Competency/Rubric Definitions: A Learning Management System (LMS) is responsible for displaying to a teacher the set of competencies/academic standards that are addressed by learning materials. The content is annotated with the competencies/academic standards from more than one source. A mapping between these competencies/academic standards from the different sources can be used to vary the information displayed. The mapping between the sources can supplied as a set of associations which must be supplied by one or other of the sources.
* Title:: Level
  * Obtaining the Associations between Academic Standards/Competency/Rubric Definitions: Summary
* Title:: Actors:
  * Obtaining the Associations between Academic Standards/Competency/Rubric Definitions: Primary - Learning Management System (Institution) and Competency/Academic Standard Repositories (Districts)          Secondary - Teacher
* Title:: Stakeholder:
  * Obtaining the Associations between Academic Standards/Competency/Rubric Definitions: Teaching Institution e.g. School
* Title:: Interest:
  * Obtaining the Associations between Academic Standards/Competency/Rubric Definitions: Different organizations have preferred ways to compose a competency/academic standard.  Suppliers of content want to annotate their materials to cover as wide a range of competencies/academic standards as possible. Therefore, a cross-walk between those different competency/academic standards is essential to understand their equivalence.
* Title:: Notes:
  * Obtaining the Associations between Academic Standards/Competency/Rubric Definitions: In terms of the CASE specification, the LMS must have obtained the mappings using the appropriate CFAssociations structures.  Once these associations have been supplied the LMS can use the cross-walk to display the competencies/academic standards in the structure preferred by the user.


2.5. Use-case 5 (Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme)
--------------------------------------------------------------------------------------------------------------------------------------------

The summary description for this use-case is given in Table 2.5.


Table 2.5 Obtaining all of the detailed definitions of the academic standards/competencies/rubrics for a module, course or programme use-case.


* Title:: Local ID:
  * Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: CASE-05
* Title:: Description:
  * Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: A teacher wishes to obtain all of the information for a competency/academic standard for a key learning structure e.g. a course, a programme, etc. A detailed example is that a teacher needs to use all of the information (this includes all of the statements, the licenses, the rubrics, etc.) for the definition for a subject e.g. Year 11 French. Therefore the institution's LMS must have obtained this breakdown from the corresponding District Learning Standards definitions repository. The teacher can then review the subject definition information through the institution's LMS.
* Title:: Level
  * Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: Summary
* Title:: Actors:
  * Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: Primary - Learning Management System (Institution) and Competency/Academic Standard Repository (District)           Secondary - Teacher
* Title:: Stakeholder:
  * Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: Teaching Institution e.g. School
* Title:: Interest:
  * Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: It is essential that all of the information for the competency/academic standard definitions for the education to be supplied and against which the student will be measured are available electronically and installed in the institution's Learning Management System (LMS).
* Title:: Notes:
  * Obtaining All of the Detailed Definitions of the Academic Standards/Competencies/Rubrics for a Module, Course or Programme: In terms of the CASE specification, the LMS must have obtained the appropriate CFPackage structures.  The CFPackage is a container for the CFDocument, the set of CFItems, the CFAssociations, the CFRubrics and the set of structural definitions i.e. the CFConcepts, the CFSubjects, the CFAssociationGroupings, the CFItemTypes and the CFLicenses. The teacher does not need to be aware of how the LMS has obtained the definitions, merely that they are available and assured that they are consistent with the definitions supplied by the District.


[toc](#toc) | [top](#top)

* * *

3\. The Conceptual Model
------------------------

3.1. The Information to be Exchanged
------------------------------------

The CASE Service specification is the definition of how systems achieve the exchange of information about learning standards and/or competencies. Analysis of the underlying structure of both a competency and an academic standard determined that information constructs could be represented using the same data model. This enables the use of a single interoperability data model, which is composed of three core constructs:

*   The root definition document - the top level structure that collects together the set of statements that define the individual competencies/academic standards. Within CASE this structure is identified as the CFDocument;
*   The set of composition statements - the set of statements into which the top level competency/academic standards has been decomposed. Within CASE this structure is identified as the CFItem;
*   The rubric - the detailed definition of how it can be determined that mastery of the associated competency/standard has been achieved. This requires the definition of specific criteria used for each of the scores that can be awarded during an assessment. Within CASE this structure is identified as the CFRubric.

The composition and logical structure of a competency/academic standard is shown in Figure 3.1. The document is the container for the set of competency/academic standard statements. In general these statements will themselves be broken into sub-statements, etc. The CASE specification defines a data model for this hierarchical structure with the hierarchy determined using a linked list approach.

![Diagram of the composition and logical structure of a competency/academic standard.](files/images/fig3p1_standardv1.jpg)

Figure 3.1 - The composition and logical structure of a competency/academic standard.

The breakdown of a competency/academic standard into its component statements must be undertaken by an appropriately skilled individual. The CASE specification is unconcerned by the actual breakdown i.e. the specification can be used to exchange any breakdown and the specification can also be used to describe the association between different breakdowns. A typical example of this is that every K-12 District will have a breakdown for subjects such as Maths, Physics, etc. and so these can be aligned using encoding in the CASE data model.

The composition and logical structure of a rubric is shown in Figure 3.2. A rubric is a matrix. Each row in the matrix is used to define a 'Criterion' and so the set of rows define the set of Rubric Criteria. For each row the set of columns are the rubric criterion level definitions with an associated score. In CASE each rubric criterion is defined in the CFRubricCriterion data model with the rubric criterion levels defined using the CFRubricCriterionLevel data model.

![Diagram of the composition and logical structure of a rubric.](files/images/fig3p2_rubricv1.jpg)

Figure 3.2 - The composition and logical structure of a rubric.

A rubric is associated to a competency/academic standard statement i.e. a CFRubric is linked to a CFItem. A CFRubric may be used for more than one CFItem but in terms of data interoperability there is a 1-to-1 relationship.

3.2. Logical Data Model
-----------------------

The data model for the CASE specification consists of a set of core classes which are used to define the data properties. A logical representation of the logical data model for the data structures in the CASE service is shown in Figure 3.3.

![Diagram of the logical data model CASE specification.](files/images/fig3p3_logicalmodelv1.jpg)

Figure 3.3 - The logical data model for the CASE specification.

The set of classes in the logical model are:

*   CFPackage - this is the top-level container for the exchange of a single, complete, package of data. The CFDocument is the root structure and this determines the scope of information that must be contained within the CFPackage;
*   CFDocument - this is the root for the associated academic standards or competency definitions. The mapping between the academic standard/competency and the range of the learning covered is an issue that must be covered by those defining the academic standard/competency;
*   CFItem - an academic standard/competency document definition must include a set of CFItems in which the hierarchy of learning objects is defined and refined;
*   CFAssociation - the set of associations between the root CFDocument and other CFDocuments (not included in the CFPackage) and between CFItems and other CFItems (not included in the CFPackage). This feature allows one competency framework to be aligned to other competency frameworks. An extensive vocabulary is available to define the type of association;
*   CFDefinition - a container for the set of low-level definitions that are used to convert the logical CFDocument/CFItem structures into structures that have educational meaning. This structure only has meaning within the context of a CFPackage;
*   CFConcept - a concept as used in defining an academic standard/competency. The actual concepts should be based upon an established vocabulary available for the application context;
*   CFSubject - a subject as used in defining an academic standard/competency. The actual subjects should be based upon an established vocabulary available for the application context;
*   CFLicense - a license for using an academic standard/competency;
*   CFItemType - an item-type as used in defining an academic standard/competency;
*   CFAssociationGroup - a grouping of associations when defining an academic standard/competency;
*   CFRubric - a rubric as used in defining an academic standard/competency (consider this as a matrix);
*   CFRubricCriterion - defining a row within the CFRubric matrix. A CFRubricCriterion is aligned to a CFItem;
*   CFRubricCriterionLevel - the definitions of the individual points required for each level with the CFRubricCriterion (i.e. the definition of each column in the associated row).

3.3. Package Structure
----------------------

A Competency Framework Package (CFPackage) is the structure that is used to contain a CFDocument and all of the associated components to create a complete and standalone structure i.e. a system using the CFPackage has no need for other contextual data. A schematic representation of the structure of a CASE package is shown in Figure 3.4.

![Diagram of the schematic representation of the structure of a CASE package.](files/images/fig3p4_packagestructurev1.jpg)

Figure 3.4 - A schematic representation of the structure of a CASE package.

The outer container, the CFPackage, has direct children of:

*   CFDocument - the root structure for the set of definitions. There must be one, and only one, CFDocument structure;
*   CFItems - the set of CFItems that are required to provide the complete set of definitions for the CFDocument i.e. the set of direct CFItem children and any of the recurring CFItem children for the CFItems;
*   CFAssociations - the set of CFDocument and CFItem association records. The package does NOT include the associated CFDocuments or CFItems (these would need to be retrieved using the relevant CASE service calls);
*   CFDefinition - this is a container, only one such container is permitted, for the set of detailed structures for the CFItems and CFDocument. The detailed structures are:-
    *   CFConcepts - all of the CFConcepts used in the definitions and the associated set of child CFConcepts;
    *   CFSubjects - all of the CFSubjects used in the definitions and the associated set of child CFSubjects;
    *   CFLicenses - all of the CFLicenses for the use of the CFItems and CFDocument;
    *   CFItemTypes - all of the CFItemTypes used in the definitions and the associated set of child CFItemTypes;
    *   CFAssociationGroupings - all of the groups of CFAssociations;
*   CFRubrics - the set of CFRubrics. The contained child structures are:-
    *   CFRubricCriteria - the set of CFRubricCriterions i.e. required to enable the complete definitions for each of the CFRubric;
    *   CFRubricCriterionLevels - the set of RubricCriteronLevels i.e. required to enable the complete definitions for each of the CFRubricCriterion (these are contained with the corresponding CFRubricCriterion structure).

3.4. Interoperability Model
---------------------------

The CASE service defines how data about learning standards and competencies is exchanged. It does not address how the data is stored and/or processed in the end-systems that exchange the information. A schematic representation of the service provided by the CASE specification is shown in Figure 3.5.

![Diagram of the interoperability supplied by the CASE service.](files/images/fig3p5_interoperabilitymodelv1.jpg)

Figure 3.5 - The interoperability supplied by the CASE service.

The CASE is realised as a set of Web Services (the actual implementation is defined by the associated binding specification and, currently, only a REST/JSON based binding is available). In CASE 1.0/1.1 only a pull service model is provided i.e. a consumer must read the data from a service provider. It is possible to chain systems together and so some systems could be both an CASE consumer and service provider. In the cases where an intermediate system acquires data from more than one service provider (it is a data aggregator) it must support both consumer and provider functionality.

[toc](#toc) | [top](#top)

* * *

4\. Service Architecture and Specification Model
------------------------------------------------

4.1. An Abstract Representation
-------------------------------

It is important to remember that this document contains a description of the underlying information model in terms of the abstract Application Programming Interface (API). The manner in which this abstract representation is visualized is not intended to dictate the implementation form of the Service. The breakdown of the service into its interface classes is a convenient way to document the set of behaviors. The objective for producing these interfaces is to identify and define the messages that are exchanged between the end-systems to realize the system behaviors required of the service.

The internal organization of an implementation of the full abstract API is beyond the scope of this specification. The only constraint is that the external behavior of the abstract API complies with this specification. This means that a .NET, J2EE, etc. physical implementation of this abstract API does not have to represent the functionality using the same breakdown of operations/methods. This physical implementation is not subject to the conformance specification.

It is important to note that the UML representation of the interfaces is used to help develop and document the Information Model and various Bindings. It is not a requirement for a system to implement this interface as defined i.e. to use the same parameters, etc. Conformance against this specification will be confirmed by inspecting the appropriate binding of the information model and ensuring that the relevant information is present and that different sequences of activity result in the predicted and mandated behavior. It is essential that the behaviors described by each of the operations are fully supported and that the behaviors described by different sequences are also maintained.

4.2. Service Architecture and Specification Model
-------------------------------------------------

The basic architectural model for the CASE Service specification is shown in Figure 4.1. In this architecture the scope of the 1EdTech CASE Service specification is shown as the dotted line. The scope of the interoperability is the data and behavioral models of the objects being exchanged.

![Diagram of the CASE service architecture.](files/images/fig4p1_architecturev1.jpg)

Figure 4.1 - The CASE service architecture.

It is important to remember that the structure of the exchanged information has NO bearing on how the same information is contained within the 'consumer' and 'provider' CASE systems (the CASE repositories in the two end-systems). It is simply a representation of the data used to facilitate exchange between the end-systems. The only constraint on the end-system repositories is that they provide data persistence consistent with the required behavior.

4.3. Service Objects
--------------------

The set of service objects that are exchanged between end-systems are:

*   CFPackage - the container for the complete set of data for a CFDocument i.e. including its component CFItems, CFAssociations, etc.
*   CFDocument - the container for the CFDocument data only i.e. it does not contain any of the components e.g. CFItems, etc.
*   CFItem - the container for the CFItem data only;
*   CFAssociation - the container for the CFAssociation data only (this could be for any type of association);
*   CFConcept - the container for the CFConcept data and the child CFConcepts as defined by the hierarchy;
*   CFSubject - the container for the CFSubject data and the child CFConcepts as defined by the hierarchy;
*   CFLicense - the container for the CFLicense data only;
*   CFItemType - the container for the CFItemType data and the child CFConcepts as defined by the hierarchy i.e. it does not include data about CFItems;
*   CFAssociationGrouping - the container for the CFAssociationGrouping data only i.e. it does not include data about CFAssociations;
*   CFRubric - the container for the CFRubric data and the associated CFRubricCriteria and CFRubricCriterionLevels.

The set of service collection objects that are exchanged between end-systems are:

*   CFDocumentSet - the complete set of CFDocuments;
*   CFAssociationSet - the set of CFAssociations for an identified CFItem and the CFItem data itself.

4.4. A Synchronous Service
--------------------------

The CASE Service is a synchronous service i.e. the consumer is blocked until the response from the provider is received. This means that a consumer can only have one outstanding request with a service provider. The corresponding sequence of actions is shown in Figure 4.2.

![Diagram of the action sequence for the CASE synchronous service.](files/images/fig4p2_syncservicev1.jpg)

Figure 4.2 - The action sequence for the CASE synchronous service.

Figure 4.2 shows the action sequence from the perspective of the consumer but it must be noted that a Service Provider will be expected to support concurrent requests (perhaps hundreds to thousands) from many consumers.

[toc](#toc) | [top](#top)

* * *

5\. The Behavior Model
----------------------

This Section is NORMATIVE

5.1 Service Definition
----------------------

The model for the service representation is shown in Figure 5.1 and Table 5.1 (the syntax and semantics for this representation is described in [Appendix A1.1](#AppA1.1)). Following the service definition are the descriptions for the set of corresponding service operations (the syntax and semantics for these descriptions is described in [Appendix A1.2](#AppA1.2)).

![UML model of the service.](files/figures/FigBehavior_Service_CASEServiceGroup.svg)

Figure 5.1 - Service interface definitions.


Table 5.1 The set of interfaces.


* Interface: AssociationsManager
  * Description: The set of service operations that manage access to the Competency Framework Associations. Associations are to establish relationships between definitions from different sources. This interface manages the associations between CFDocuments and between CFItems.
* Interface: DefinitionsManager
  * Description: The set of service operations that manage access to the Competency Framework Definitions. This interface manages the definitions of the: Competency Framework Concepts, Competency Framework Subjects, Competency Framework Licenses, Competency Framework Item Types and Competency Framework Association Groupings.
* Interface: DocumentsManager
  * Description: The set of service operations that manage access to the Competency Framework Documents. Documents are the root entry point for the definition of an academic standard/competency. This interface manages the document descriptions only i.e. it does not support the management of Items, Associations, etc.
* Interface: ItemsManager
  * Description: The set of service operations that manage access to the Competency Framework Items. Items are the containers for the definitions in an academic standard/competency. This interface manages the Item descriptions only i.e. it does not support the management of Associations, etc.
* Interface: PackagesManager
  * Description: The set of service operations that manage access to the Competency Framework Packages as a whole. A Competency Framework Package is a package that contains all of the arefacts that are used for the definition of a Competency Framework Document.
* Interface: RubricsManager
  * Description: The set of service operations that manage access to the Competency Framework Rubrics. Rubrics associate the set of rubric criteria being defined for a specific academic standard/competency (defined as either a CFItem or a CFDocument).


5.2 AssociationsManager Interface Description
---------------------------------------------

The set of service operations that manage access to the Competency Framework Associations. Associations are to establish relationships between definitions from different sources. This interface manages the associations between CFDocuments and between CFItems.

The set of operations for this interface are summarized in Table 5.2.


Table 5.2 The set of operations for the "AssociationsManager" interface.


* Operation: getCFItemAssociations
  * Description: This is a request to the Service Provider to provide the all of the Competency Associations for the specified CFItem and the information about the CFItem itself.  If the identified record cannot be found then the 'unknownobject' status code must be reported.
* Operation: getCFAssociation
  * Description: This is a request to the service provider to provide the information for the specific Competency Framework Association. If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.2.1 "getCFItemAssociations" Operation



* Name:: Return Function Parameter:
  * getCFItemAssociations (): statusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFItemAssociations (): sourcedId : UUID - the UUID that identifies the CFItem for which ALL associations are to be supplied.
* Name:: Returned (out) Parameters:
  * getCFItemAssociations (): associationSet : CFAssociationSet - the set of CFAssociations that are associated with the specified CFItem and the CFItem itself.
* Name:: Behavior:
  * getCFItemAssociations (): This is a request to the Service Provider to provide the all of the Competency Associations for the specified CFItem and the information about the CFItem itself.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.2.2 "getCFAssociation" Operation



* Name:: Return Function Parameter:
  * getCFAssociation (): imsx_StatusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFAssociation (): sourcedId : UUID - the UUID that identifies the CFAssociation to be supplied.
* Name:: Returned (out) Parameters:
  * getCFAssociation (): association : CFAssociation - the CFAssociation object that was specified in the request.
* Name:: Behavior:
  * getCFAssociation (): This is a request to the service provider to provide the information for the specific Competency Framework Association. If the identified record cannot be found then the 'unknownobject' status code must be reported.


5.3 DefinitionsManager Interface Description
--------------------------------------------

The set of service operations that manage access to the Competency Framework Definitions. This interface manages the definitions of the: Competency Framework Concepts, Competency Framework Subjects, Competency Framework Licenses, Competency Framework Item Types and Competency Framework Association Groupings.

The set of operations for this interface are summarized in Table 5.3.


Table 5.3 The set of operations for the "DefinitionsManager" interface.


* Operation: getCFConcept
  * Description: This is a request to the Service Provider to provide the specified Competency Framework Concept and the set of children CFConcepts as identified by the hierarchy codes.  If the identified record cannot be found then the 'unknownobject' status code must be reported.
* Operation: getCFSubject
  * Description: This is a request to the Service Provider to provide the specified Competency Framework Subject and the set of children CFSubjects as identified by the hierarchy codes.  If the identified record cannot be found then the 'unknownobject' status code must be reported.
* Operation: getCFLicense
  * Description: This is a request to the Service Provider to provide the specified Competency Framework License.  If the identified record cannot be found then the 'unknownobject' status code must be reported.
* Operation: getCFItemType
  * Description: This is a request to the Service Provider to provide the specified Competency Framework Item Type and the set of children CFItemTypes as identified by the hierarchy codes.  If the identified record cannot be found then the 'unknownobject' status code must be reported.
* Operation: getCFAssociationGrouping
  * Description: This is a request to the Service Provider to provide the specified Competency Framework Association Grouping.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.3.1 "getCFConcept" Operation



* Name:: Return Function Parameter:
  * getCFConcept (): imsx_StatusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFConcept (): sourcedId : UUID - the UUID that identifies the Competency Framework Concept that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFConcept (): conceptSet : CFConceptSet - the specific Competency Framework Concept object that has been specified plus the associated set of child CFConcepts.
* Name:: Behavior:
  * getCFConcept (): This is a request to the Service Provider to provide the specified Competency Framework Concept and the set of children CFConcepts as identified by the hierarchy codes.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.3.2 "getCFSubject" Operation



* Name:: Return Function Parameter:
  * getCFSubject (): imsx_StatusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFSubject (): sourcedId : UUID - the UUID that identifies the Competency Framework Subject that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFSubject (): subjectSet : CFSubjectSet - the specific Competency Framework Subject object that has been specified plus the associated set of child CFSubjects.
* Name:: Behavior:
  * getCFSubject (): This is a request to the Service Provider to provide the specified Competency Framework Subject and the set of children CFSubjects as identified by the hierarchy codes.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.3.3 "getCFLicense" Operation



* Name:: Return Function Parameter:
  * getCFLicense (): imsx_StatusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFLicense (): sourcedId : UUID - the UUID that identifies the Competency Framework License that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFLicense (): license : CFLicense - the specific Competency Framework License object that has been requested.
* Name:: Behavior:
  * getCFLicense (): This is a request to the Service Provider to provide the specified Competency Framework License.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.3.4 "getCFItemType" Operation



* Name:: Return Function Parameter:
  * getCFItemType (): imsx_StatusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFItemType (): sourcedId : UUID - the UUID that identifies the Competency Framework ItemType that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFItemType (): itemTypeSet : CFItemTypeSet - the specific Competency Framework ItemType object that has been specified plus the associated set of child CFItemTypes.
* Name:: Behavior:
  * getCFItemType (): This is a request to the Service Provider to provide the specified Competency Framework Item Type and the set of children CFItemTypes as identified by the hierarchy codes.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.3.5 "getCFAssociationGrouping" Operation



* Name:: Return Function Parameter:
  * getCFAssociationGrouping (): imsx_StatusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFAssociationGrouping (): sourcedId : UUID - the UUID that identifies the Competency Framework AssociationGrouping that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFAssociationGrouping (): associationGrouping : CFAssociationGrouping - the specific Competency Framework AssociationGrouping object that has been requested.
* Name:: Behavior:
  * getCFAssociationGrouping (): This is a request to the Service Provider to provide the specified Competency Framework Association Grouping.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


5.4 DocumentsManager Interface Description
------------------------------------------

The set of service operations that manage access to the Competency Framework Documents. Documents are the root entry point for the definition of an academic standard/competency. This interface manages the document descriptions only i.e. it does not support the management of Items, Associations, etc.

The set of operations for this interface are summarized in Table 5.4.


Table 5.4 The set of operations for the "DocumentsManager" interface.


* Operation: getAllCFDocuments
  * Description: This is a request to the Service Provider to provide all of the Competency Framework Documents. 
* Operation: getCFDocument
  * Description: This is a request to the service provider to provide the information for the specific Competency Framework Document. If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.4.1 "getAllCFDocuments" Operation



* Name:: Return Function Parameter:
  * getAllCFDocuments (): statusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getAllCFDocuments (): None.
* Name:: Returned (out) Parameters:
  * getAllCFDocuments (): documentSet : CFDocumentSet - the set of Competency Framework Documents supplied by the Service Provider.
* Name:: Behavior:
  * getAllCFDocuments (): This is a request to the Service Provider to provide all of the Competency Framework Documents. 
* Name:: Notes:
  * getAllCFDocuments ():                         Query Parameters for the REST-based binding have been defined for this operation, namely:                                                    limit - this is used as part of the data pagination mechanism to control the download rate of data. The 'limit' defines the download segmentation value i.e. the maximum number of records to be contained in the response. The form of implementation is described in the corresponding binding document(s).                            offset - this is used as part of the data pagination mechanism to control the download rate of data. The 'offset' is the number of the first record to be supplied in the segmented response message. The form of implementation is described in the corresponding binding document(s).                            sort - this is used as part of the sorting mechanism to be use by the service provider. The 'sort' identifies the sort criteria to be used for the records in the response message. Use with the orderBy parameter. The form of implementation is described in the corresponding binding document(s).                            orderBy - this is used as part of the sorting mechanism to be use by the service provider. This defines the form of ordering for response to the sorted request i.e. ascending (asc) or descending (desc). The form of implementation is described in the corresponding binding document(s).                            filter - this is used for the data filtering mechanism to be applied by the service provider. It defines the filtering rules to be applied when identifying the records to be supplied in the response message. The form of implementation is described in the corresponding binding document(s).                            fields - this is used as part of the field selection mechanism to be applied by the service provider. This identifies the range of fields that should be supplied in the response message. The form of implementation is described in the corresponding binding document(s).                                            


### 5.4.2 "getCFDocument" Operation



* Name:: Return Function Parameter:
  * getCFDocument (): statusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFDocument (): sourcedId : UUID - the UUID that identifies the Competency Framework Document that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFDocument (): document : CFDocument - the specific Competency Framework Document object that has been requested.
* Name:: Behavior:
  * getCFDocument (): This is a request to the service provider to provide the information for the specific Competency Framework Document. If the identified record cannot be found then the 'unknownobject' status code must be reported.


5.5 ItemsManager Interface Description
--------------------------------------

The set of service operations that manage access to the Competency Framework Items. Items are the containers for the definitions in an academic standard/competency. This interface manages the Item descriptions only i.e. it does not support the management of Associations, etc.

The set of operations for this interface are summarized in Table 5.5.


Table 5.5 The set of operations for the "ItemsManager" interface.


* Operation: getCFItem
  * Description: This is a request to the Service Provider to provide the specified Competency Framework Item.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.5.1 "getCFItem" Operation



* Name:: Return Function Parameter:
  * getCFItem (): statusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFItem (): sourcedId : UUID - the UUID that identifies the Competency Framework Item that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFItem (): item : CFItem - the specific Competency Framework Item object that has been requested.
* Name:: Behavior:
  * getCFItem (): This is a request to the Service Provider to provide the specified Competency Framework Item.  If the identified record cannot be found then the 'unknownobject' status code must be reported.


5.6 PackagesManager Interface Description
-----------------------------------------

The set of service operations that manage access to the Competency Framework Packages as a whole. A Competency Framework Package is a package that contains all of the arefacts that are used for the definition of a Competency Framework Document.

The set of operations for this interface are summarized in Table 5.6.


Table 5.6 The set of operations for the "PackagesManager" interface.


* Operation: getCFPackage
  * Description: This is a request to the service provider to provide the information for the specific Competency Framework Package. If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.6.1 "getCFPackage" Operation



* Name:: Return Function Parameter:
  * getCFPackage (): statusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFPackage (): sourcedId : UUID - the UUID that identifies the Competency Framework Document that is to be read from the service provider and supplied with all of its component artefacts.
* Name:: Returned (out) Parameters:
  * getCFPackage (): package : CFPackage - the specific Competency Framework Package object that has been requested.
* Name:: Behavior:
  * getCFPackage (): This is a request to the service provider to provide the information for the specific Competency Framework Package. If the identified record cannot be found then the 'unknownobject' status code must be reported.


5.7 RubricsManager Interface Description
----------------------------------------

The set of service operations that manage access to the Competency Framework Rubrics. Rubrics associate the set of rubric criteria being defined for a specific academic standard/competency (defined as either a CFItem or a CFDocument).

The set of operations for this interface are summarized in Table 5.7.


Table 5.7 The set of operations for the "RubricsManager" interface.


* Operation: getCFRubric
  * Description: This is a request to the service provider to provide the information for the specific Competency Framework Rubric. If the identified record cannot be found then the 'unknownobject' status code must be reported.


### 5.7.1 "getCFRubric" Operation



* Name:: Return Function Parameter:
  * getCFRubric (): statusInfo : imsx_StatusInfo - the status information report for the request. This report has end-to-end significance and must map between the messaging technology approach and the business transaction API. For REST-based bindings this structure describes the message payload that must be returned when the request has not been successfully completed.
* Name:: Supplied (in) Parameters:
  * getCFRubric (): sourcedId : UUID - the UUID that identifies the Competency Framework Rubric that is to be read from the service provider.
* Name:: Returned (out) Parameters:
  * getCFRubric (): rubric : CFRubric - the specific Competency Framework Rubric object (including the associated CFRubricCriteria and CFRubricCriterionLevels) that has been requested.
* Name:: Behavior:
  * getCFRubric (): This is a request to the service provider to provide the information for the specific Competency Framework Rubric. If the identified record cannot be found then the 'unknownobject' status code must be reported.


[toc](#toc) | [top](#top)

* * *

6\. The Interface Model
-----------------------

This Section is NORMATIVE

The set of operations described within the behavior model ([The Behavior Model](#Main5)) are based upon class descriptions specific to the parameters of the operations. All parameters are mandatory. The syntax and semantics for this representation is described in [Appendix A2](#AppA2).

6.1 CFAssociation Class Description
-----------------------------------

The data model for the "CFAssociation" class is shown in Figure 6.1 and the accompanying definition in Table 6.1.

![UML diagram of the CFAssociation class.](files/figures/FigInterface_Parameter_CFAssociation.svg)

Figure 6.1 - CFAssociation class definitions.


Table 6.1 Description of the "CFAssociation" class.


* Descriptor: Class Name
  * Definition: CFAssociation
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFAssociation                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocumentURI                                                The set of directly inherited children attributes are:                                                    identifier                            associationType                            sequenceNumber                            uri                            originNodeURI                            destinationNodeURI                            CFAssociationGroupingURI                            lastChangeDateTime                            notes                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    CFDocumentURI                                            
* Descriptor: Description
  * Definition: This is the container for the data about the relationship between two CFDocuments or between two CFItems outside of the context of a CFPackage or CFItem.


### 6.1.1 "CFDocumentURI" Attribute Description

The description of the "CFDocumentURI" attribute for the "CFAssociation" class is given in Table 6.1.1.


Table 6.1.1 Description of the "CFDocumentURI" attribute for the "CFAssociation" class.


* Descriptor: Attribute Name
  * Definition: CFDocumentURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFDocument that would be used in the context of this CFAssociation using a network-resolvable URI.
* Descriptor: Link Data
  * Definition: This is the URI for the associated CFDocument.See CFDocument for the details about this link.


6.2 CFAssociationGrouping Class Description
-------------------------------------------

The data model for the "CFAssociationGrouping" class is shown in Figure 6.2 and the accompanying definition in Table 6.2.

![UML diagram of the CFAssociationGrouping class.](files/figures/FigInterface_Parameter_CFAssociationGrouping.svg)

Figure 6.2 - CFAssociationGrouping class definitions.


Table 6.2 Description of the "CFAssociationGrouping" class.


* Descriptor: Class Name
  * Definition: CFAssociationGrouping
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFAssociationGrouping                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            description                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: This is the container for information about a set of associations that have been labelled as a group (the nature of the group being defined by this container).


### 6.2.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFAssociationGrouping" class is given in Table 6.2.1.


Table 6.2.1 Description of the "identifier" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFAssociationGrouping. This is the primary way in which the exchange identification is achieved.


### 6.2.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFAssociationGrouping" class is given in Table 6.2.2.


Table 6.2.2 Description of the "uri" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: uri
* Descriptor: Data Type
  * Definition: AnyURI (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFAssociationGrouping using a network-resolvable URI. 


### 6.2.3 "title" Attribute Description

The description of the "title" attribute for the "CFAssociationGrouping" class is given in Table 6.2.3.


Table 6.2.3 Description of the "title" attribute for the "CFAssociationGrouping" class.

|Descriptor    |Definition                             |
|--------------|---------------------------------------|
|Attribute Name|title                                  |
|Data Type     |NormalizedString (Primitive-type)      |
|Value Space   |See Appendix A3.3.                     |
|Scope         |Local ("-")                            |
|Multiplicity  |[1]                                    |
|Privacy       |There are NO privacy implications.     |
|Description   |The title of the CFAssociationGrouping.|


### 6.2.4 "description" Attribute Description

The description of the "description" attribute for the "CFAssociationGrouping" class is given in Table 6.2.4.


Table 6.2.4 Description of the "description" attribute for the "CFAssociationGrouping" class.

|Descriptor    |Definition                                                |
|--------------|----------------------------------------------------------|
|Attribute Name|description                                               |
|Data Type     |String (Primitive-type)                                   |
|Value Space   |See Appendix A3.3.                                        |
|Scope         |Local ("-")                                               |
|Multiplicity  |[0..1]                                                    |
|Privacy       |There are NO privacy implications.                        |
|Description   |A human readable description of the CFAssociationGrouping.|


### 6.2.5 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFAssociationGrouping" class is given in Table 6.2.5.


Table 6.2.5 Description of the "lastChangeDateTime" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


### 6.2.6 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFAssociationGrouping" class is given in Table 6.2.6.


Table 6.2.6 Description of the "extensions" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFAssociationGroupingExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


6.3 CFAssociationSet Class Description
--------------------------------------

The data model for the "CFAssociationSet" class is shown in Figure 6.3 and the accompanying definition in Table 6.3.

![UML diagram of the CFAssociationSet class.](files/figures/FigInterface_Parameter_CFAssociationSet.svg)

Figure 6.3 - CFAssociationSet class definitions.


Table 6.3 Description of the "CFAssociationSet" class.


* Descriptor: Class Name
  * Definition: CFAssociationSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFItemAssociations                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFItem                            CFAssociations                                            
* Descriptor: Description
  * Definition: This is the container for a collection of CFAssociations. There must be at least one CFAssociation. Note that the association can be between CFDocuments or between CFItems.


### 6.3.1 "CFItem" Attribute Description

The description of the "CFItem" attribute for the "CFAssociationSet" class is given in Table 6.3.1.


Table 6.3.1 Description of the "CFItem" attribute for the "CFAssociationSet" class.


* Descriptor: Attribute Name
  * Definition: CFItem
* Descriptor: Data Type
  * Definition: CFItem
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is the container for the specified CFItem object. This is the content that either describes a specific competency (learning objective) or describes a grouping of competencies within the taxonomy of a Competency Framework Document. 


### 6.3.2 "CFAssociations" Attribute Description

The description of the "CFAssociations" attribute for the "CFAssociationSet" class is given in Table 6.3.2.


Table 6.3.2 Description of the "CFAssociations" attribute for the "CFAssociationSet" class.


* Descriptor: Attribute Name
  * Definition: CFAssociations
* Descriptor: Data Type
  * Definition: CFPckgAssociation
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is the data for a single CFAssociation within the CFAssociationSet container. The association can be between CFDocuments or between CFItems


6.4 CFConceptSet Class Description
----------------------------------

The data model for the "CFConceptSet" class is shown in Figure 6.4 and the accompanying definition in Table 6.4.

![UML diagram of the CFConceptSet class.](files/figures/FigInterface_Parameter_CFConceptSet.svg)

Figure 6.4 - CFConceptSet class definitions.


Table 6.4 Description of the "CFConceptSet" class.


* Descriptor: Class Name
  * Definition: CFConceptSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFConcept                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFConcepts                                            
* Descriptor: Description
  * Definition: The container for the set of CFConcepts supplied in the response payload. The relationship between the CFConcepts is determined by the 'hierarchyCode'. The first CFConcept is that which has been specified in the call. The other CFConcepts are the set of children as determined by their place in the 'hierarchyCode' of the CFConcept.


### 6.4.1 "CFConcepts" Attribute Description

The description of the "CFConcepts" attribute for the "CFConceptSet" class is given in Table 6.4.1.


Table 6.4.1 Description of the "CFConcepts" attribute for the "CFConceptSet" class.


* Descriptor: Attribute Name
  * Definition: CFConcepts
* Descriptor: Data Type
  * Definition: CFConcept
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFConcepts. The relationship between the CFConcepts is determined by the 'hierarchyCode'. The first CFConcept is that which has been specified in the call. The other CFConcepts are the set of children as determined by their place in the 'hierarchyCode' of the CFConcept.


6.5 CFDocument Class Description
--------------------------------

The data model for the "CFDocument" class is shown in Figure 6.5 and the accompanying definition in Table 6.5.

![UML diagram of the CFDocument class.](files/figures/FigInterface_Parameter_CFDocument.svg)

Figure 6.5 - CFDocument class definitions.


Table 6.5 Description of the "CFDocument" class.


* Descriptor: Class Name
  * Definition: CFDocument
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFDocument                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFPackageURI                                                The set of directly inherited children attributes are:                                                    identifier                            uri                            frameworkType                            caseVersion                            creator                            title                            lastChangeDateTime                            officialSourceURL                            publisher                            description                            subject                            subjectURI                            language                            version                            adoptionStatus                            statusStartDate                            statusEndDate                            licenseURI                            notes                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    CFPackageURI                                            
* Descriptor: Description
  * Definition: The container for the data about a competency framework document (CFDocument) when exchanged outside of the context of a CFPackage. A CFDocument is the root for the creation of a learning standard/competency.


### 6.5.1 "CFPackageURI" Attribute Description

The description of the "CFPackageURI" attribute for the "CFDocument" class is given in Table 6.5.1.


Table 6.5.1 Description of the "CFPackageURI" attribute for the "CFDocument" class.


* Descriptor: Attribute Name
  * Definition: CFPackageURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFPackage that would be used to contain this CFDocument using a network-resolvable URI.
* Descriptor: Link Data
  * Definition: This is the URI for the associated CFPackage.See CFPackage for the details about this link.


6.6 CFDocumentSet Class Description
-----------------------------------

The data model for the "CFDocumentSet" class is shown in Figure 6.6 and the accompanying definition in Table 6.6.

![UML diagram of the CFDocumentSet class.](files/figures/FigInterface_Parameter_CFDocumentSet.svg)

Figure 6.6 - CFDocumentSet class definitions.


Table 6.6 Description of the "CFDocumentSet" class.


* Descriptor: Class Name
  * Definition: CFDocumentSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getAllCFDocuments                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocuments                                            
* Descriptor: Description
  * Definition: This is the container for a collection of CFDocuments. There must be at least one CFDocument.


### 6.6.1 "CFDocuments" Attribute Description

The description of the "CFDocuments" attribute for the "CFDocumentSet" class is given in Table 6.6.1.


Table 6.6.1 Description of the "CFDocuments" attribute for the "CFDocumentSet" class.

|Descriptor    |Definition                                                                  |
|--------------|----------------------------------------------------------------------------|
|Attribute Name|CFDocuments                                                                 |
|Data Type     |CFDocument                                                                  |
|Value Space   |Container [  Unordered  ]                                                   |
|Scope         |Local ("-")                                                                 |
|Multiplicity  |[1.. unbounded]                                                             |
|Privacy       |There are NO privacy implications.                                          |
|Description   |This is the data for a single CFDocument within the CFDocumentSet container.|


6.7 CFItem Class Description
----------------------------

The data model for the "CFItem" class is shown in Figure 6.7 and the accompanying definition in Table 6.7.

![UML diagram of the CFItem class.](files/figures/FigInterface_Parameter_CFItem.svg)

Figure 6.7 - CFItem class definitions.


Table 6.7 Description of the "CFItem" class.


* Descriptor: Class Name
  * Definition: CFItem
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFItem                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocumentURI                                                The set of directly inherited children attributes are:                                                    identifier                            fullStatement                            alternativeLabel                            CFItemType                            uri                            humanCodingScheme                            listEnumeration                            abbreviatedStatement                            conceptKeywords                            conceptKeywordsURI                            notes                            subject                            subjectURI                            language                            educationLevel                            CFItemTypeURI                            licenseURI                            statusStartDate                            statusEndDate                            lastChangeDateTime                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    CFDocumentURI                                            
* Descriptor: Description
  * Definition: This is the container for the CFItem data outside of the context of a CFPackage. This is the content that either describes a specific competency (learning objective) or describes a grouping of competencies within the taxonomy of a Competency Framework Document. 


### 6.7.1 "CFDocumentURI" Attribute Description

The description of the "CFDocumentURI" attribute for the "CFItem" class is given in Table 6.7.1.


Table 6.7.1 Description of the "CFDocumentURI" attribute for the "CFItem" class.


* Descriptor: Attribute Name
  * Definition: CFDocumentURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFDocument that would be used to contain this CFItem using a network-resolvable URI.
* Descriptor: Link Data
  * Definition: This is the URI for the associated CFDocument.See CFDocument for the details about this link.


6.8 CFItemTypeSet Class Description
-----------------------------------

The data model for the "CFItemTypeSet" class is shown in Figure 6.8 and the accompanying definition in Table 6.8.

![UML diagram of the CFItemTypeSet class.](files/figures/FigInterface_Parameter_CFItemTypeSet.svg)

Figure 6.8 - CFItemTypeSet class definitions.


Table 6.8 Description of the "CFItemTypeSet" class.


* Descriptor: Class Name
  * Definition: CFItemTypeSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFItemType                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFItemTypes                                            
* Descriptor: Description
  * Definition: The container for the set of CFItemTypes supplied in the response payload. The relationship between the CFItemTypes is determined by the 'hierarchyCode'. The first CFItemType is that which has been specified in the call. The other CFItemTypes are the set of children as determined by their place in the 'hierarchyCode' of the CFItemType.


### 6.8.1 "CFItemTypes" Attribute Description

The description of the "CFItemTypes" attribute for the "CFItemTypeSet" class is given in Table 6.8.1.


Table 6.8.1 Description of the "CFItemTypes" attribute for the "CFItemTypeSet" class.


* Descriptor: Attribute Name
  * Definition: CFItemTypes
* Descriptor: Data Type
  * Definition: CFItemType
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFItemTypes. The relationship between the CFItemTypes is determined by the 'hierarchyCode'. The first CFItemType is that which has been specified in the call. The other CFItemTypes are the set of children as determined by their place in the 'hierarchyCode' of the CFItemType.


6.9 CFLicense Class Description
-------------------------------

The data model for the "CFLicense" class is shown in Figure 6.9 and the accompanying definition in Table 6.9.

![UML diagram of the CFLicense class.](files/figures/FigInterface_Parameter_CFLicense.svg)

Figure 6.9 - CFLicense class definitions.


Table 6.9 Description of the "CFLicense" class.


* Descriptor: Class Name
  * Definition: CFLicense
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFLicense                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            description                            licenseText                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: The container for the information about a license used within the competency framework.


### 6.9.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFLicense" class is given in Table 6.9.1.


Table 6.9.1 Description of the "identifier" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFLicense. This is the primary way in which the exchange identification is achieved.


### 6.9.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFLicense" class is given in Table 6.9.2.


Table 6.9.2 Description of the "uri" attribute for the "CFLicense" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|uri                                                                       |
|Data Type     |AnyURI (Primitive-type)                                                   |
|Value Space   |See Appendix A3.3.                                                        |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[1]                                                                       |
|Privacy       |There are NO privacy implications.                                        |
|Description   |An unambiguous reference to the CFLicense using a network-resolvable URI. |


### 6.9.3 "title" Attribute Description

The description of the "title" attribute for the "CFLicense" class is given in Table 6.9.3.


Table 6.9.3 Description of the "title" attribute for the "CFLicense" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[1]                               |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFLicense.       |


### 6.9.4 "description" Attribute Description

The description of the "description" attribute for the "CFLicense" class is given in Table 6.9.4.


Table 6.9.4 Description of the "description" attribute for the "CFLicense" class.

|Descriptor    |Definition                                    |
|--------------|----------------------------------------------|
|Attribute Name|description                                   |
|Data Type     |String (Primitive-type)                       |
|Value Space   |See Appendix A3.3.                            |
|Scope         |Local ("-")                                   |
|Multiplicity  |[0..1]                                        |
|Privacy       |There are NO privacy implications.            |
|Description   |A human readable description of the CFLicense.|


### 6.9.5 "licenseText" Attribute Description

The description of the "licenseText" attribute for the "CFLicense" class is given in Table 6.9.5.


Table 6.9.5 Description of the "licenseText" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: licenseText
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: Legal license text used by the organization to convey license permissions. This may include the actual license text, or a link to a web location containing the license as a document or as text.


### 6.9.6 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFLicense" class is given in Table 6.9.6.


Table 6.9.6 Description of the "lastChangeDateTime" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


### 6.9.7 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFLicense" class is given in Table 6.9.7.


Table 6.9.7 Description of the "extensions" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFLicenseExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


6.10 CFPackage Class Description
--------------------------------

The data model for the "CFPackage" class is shown in Figure 6.10 and the accompanying definition in Table 6.10.

![UML diagram of the CFPackage class.](files/figures/FigInterface_Parameter_CFPackage.svg)

Figure 6.10 - CFPackage class definitions.


Table 6.10 Description of the "CFPackage" class.


* Descriptor: Class Name
  * Definition: CFPackage
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFPackage                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocument                            CFItems                            CFAssociations                            CFDefinitions                            CFRubrics                            extensions                                            
* Descriptor: Description
  * Definition: This is the container for all of the data for a Competency Framework Package i.e. the root CFDocument and ALL of the corresponding components i.e. the CFItems, CFAssociations and CFDefinitions.


### 6.10.1 "CFDocument" Attribute Description

The description of the "CFDocument" attribute for the "CFPackage" class is given in Table 6.10.1.


Table 6.10.1 Description of the "CFDocument" attribute for the "CFPackage" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|CFDocument                                                                |
|Data Type     |CFPckgDocument                                                            |
|Value Space   |Container [  Unordered  ]                                                 |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[1]                                                                       |
|Privacy       |There are NO privacy implications.                                        |
|Description   |The root Competency Framework Document. There must be only one CFDocument.|


### 6.10.2 "CFItems" Attribute Description

The description of the "CFItems" attribute for the "CFPackage" class is given in Table 6.10.2.


Table 6.10.2 Description of the "CFItems" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFItems
* Descriptor: Data Type
  * Definition: CFPckgItem
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of Competency Framework Items that are a components (direct or indirect children) of the root Competency Framework Document. There must be at least one Competency Framework Item.


### 6.10.3 "CFAssociations" Attribute Description

The description of the "CFAssociations" attribute for the "CFPackage" class is given in Table 6.10.3.


Table 6.10.3 Description of the "CFAssociations" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFAssociations
* Descriptor: Data Type
  * Definition: CFPckgAssociation
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of Competency Framework Associations. This includes: the set of associations between the component CFItems and other CFItems; the set of associations between the root CFDocument and other CFDocuments.


### 6.10.4 "CFDefinitions" Attribute Description

The description of the "CFDefinitions" attribute for the "CFPackage" class is given in Table 6.10.4.


Table 6.10.4 Description of the "CFDefinitions" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFDefinitions
* Descriptor: Data Type
  * Definition: CFDefinition
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The Competency Framework Definitions for the CFDocument and the associated component CFItems. The definitions contains the corresponding set of: CFConcepts, CFSubjects, CFLicenses, CFItemTypes and CFAssociationGroupings.


### 6.10.5 "CFRubrics" Attribute Description

The description of the "CFRubrics" attribute for the "CFPackage" class is given in Table 6.10.5.


Table 6.10.5 Description of the "CFRubrics" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFRubrics
* Descriptor: Data Type
  * Definition: CFRubric
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of Competency Framework CFRubrics including the associated CFRubricCriteria and CFRubrcCriterionLevels that are required to complete all of the information relevant to the parent CFRubric. 


### 6.10.6 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFPackage" class is given in Table 6.10.6.


Table 6.10.6 Description of the "extensions" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFPackageExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


6.11 CFRubric Class Description
-------------------------------

The data model for the "CFRubric" class is shown in Figure 6.11 and the accompanying definition in Table 6.11.

![UML diagram of the CFRubric class.](files/figures/FigInterface_Parameter_CFRubric.svg)

Figure 6.11 - CFRubric class definitions.


Table 6.11 Description of the "CFRubric" class.


* Descriptor: Class Name
  * Definition: CFRubric
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFRubric                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            description                            lastChangeDateTime                            CFRubricCriteria                            extensions                                            
* Descriptor: Description
  * Definition: The container for the definition of a rubric which is addressed by the competency framework. This includes the set of associated CFRubricCriteria and CFRubricCriterionLevels.


### 6.11.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFRubric" class is given in Table 6.11.1.


Table 6.11.1 Description of the "identifier" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFRubric. This is the primary way in which the exchange identification is achieved.


### 6.11.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFRubric" class is given in Table 6.11.2.


Table 6.11.2 Description of the "uri" attribute for the "CFRubric" class.

|Descriptor    |Definition                                                              |
|--------------|------------------------------------------------------------------------|
|Attribute Name|uri                                                                     |
|Data Type     |AnyURI (Primitive-type)                                                 |
|Value Space   |See Appendix A3.3.                                                      |
|Scope         |Local ("-")                                                             |
|Multiplicity  |[1]                                                                     |
|Privacy       |There are NO privacy implications.                                      |
|Description   |An unambiguous reference to the CFRubric using a network-resolvable URI.|


### 6.11.3 "title" Attribute Description

The description of the "title" attribute for the "CFRubric" class is given in Table 6.11.3.


Table 6.11.3 Description of the "title" attribute for the "CFRubric" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[0..1]                            |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFRubric.        |


### 6.11.4 "description" Attribute Description

The description of the "description" attribute for the "CFRubric" class is given in Table 6.11.4.


Table 6.11.4 Description of the "description" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: description
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human readable description of the CFRubric. In Version 1.1 the data-type for this attribute has been changed from NormalizedString. 


### 6.11.5 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFRubric" class is given in Table 6.11.5.


Table 6.11.5 Description of the "lastChangeDateTime" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


### 6.11.6 "CFRubricCriteria" Attribute Description

The description of the "CFRubricCriteria" attribute for the "CFRubric" class is given in Table 6.11.6.


Table 6.11.6 Description of the "CFRubricCriteria" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: CFRubricCriteria
* Descriptor: Data Type
  * Definition: CFRubricCriterion
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFRubricCriterion that are required to complete the definition of the parent CFRubric.


### 6.11.7 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFRubric" class is given in Table 6.11.7.


Table 6.11.7 Description of the "extensions" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFRubricExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


6.12 CFSubjectSet Class Description
-----------------------------------

The data model for the "CFSubjectSet" class is shown in Figure 6.12 and the accompanying definition in Table 6.12.

![UML diagram of the CFSubjectSet class.](files/figures/FigInterface_Parameter_CFSubjectSet.svg)

Figure 6.12 - CFSubjectSet class definitions.


Table 6.12 Description of the "CFSubjectSet" class.


* Descriptor: Class Name
  * Definition: CFSubjectSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFSubject                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFSubjects                                            
* Descriptor: Description
  * Definition: The container for the set of CFSubjects supplied in the response payload. The relationship between the CFSubjects is determined by the 'hierarchyCode'. The first CFSubject is that which has been specified in the call. The other CFSubjects are the set of children as determined by their place in the 'hierarchyCode' of the CFSubject.


### 6.12.1 "CFSubjects" Attribute Description

The description of the "CFSubjects" attribute for the "CFSubjectSet" class is given in Table 6.12.1.


Table 6.12.1 Description of the "CFSubjects" attribute for the "CFSubjectSet" class.


* Descriptor: Attribute Name
  * Definition: CFSubjects
* Descriptor: Data Type
  * Definition: CFSubject
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFSubjects. The relationship between the CFSubjects is determined by the 'hierarchyCode'. The first CFSubject is that which has been specified in the call. The other CFSubjects are the set of children as determined by their place in the 'hierarchyCode' of the CFSubject.


6.13 UUID Class Description
---------------------------

The data model for the "UUID" class is shown in Figure 6.13 and the accompanying definition in Table 6.13.

![UML diagram of the UUID class.](files/figures/FigInterface_Parameter_UUID.svg)

Figure 6.13 - UUID class definitions.


Table 6.13 Description of the "UUID" class.


* Descriptor: Class Name
  * Definition: UUID
* Descriptor: Class Type
  * Definition: Container [ DerivedType ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFItem                            getCFItemAssociations                            getCFAssociation                            getCFRubric                            getCFDocument                            getCFPackage                            getCFConcept                            getCFSubject                            getCFLicense                            getCFItemType                            getCFAssociationGrouping                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    pattern                                            
* Descriptor: Description
  * Definition: The data-type for establishing a Globally Unique Identifier (GUID). The form of the GUID is a Universally Unique Identifier (UUID) of 16 hexadecimal characters (lower case) in the format 8-4-4-4-12. All permitted versions (1-5) and variants (1-2) are supported.


### 6.13.1 "pattern" Attribute Description

The description of the "pattern" attribute for the "UUID" class is given in Table 6.13.1.


Table 6.13.1 Description of the "pattern" attribute for the "UUID" class.


* Descriptor: Attribute Name
  * Definition: pattern
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.Default = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5]{1}[0-9a-f]{3}-[8-9a-b]{1}[0-9a-f]{3}-[0-9a-f]{12}".
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: Defines the regular expression that imposes the form of  UUID.


6.14 imsx\_StatusInfo Class Description
---------------------------------------

The data model for the "imsx\_StatusInfo" class is shown in Figure 6.14 and the accompanying definition in Table 6.14.

![UML diagram of the imsx_StatusInfo class.](files/figures/FigInterface_Parameter_imsx_StatusInfo.svg)

Figure 6.14 - imsx\_StatusInfo class definitions.


Table 6.14 Description of the "imsx_StatusInfo" class.


* Descriptor: Class Name
  * Definition: imsx_StatusInfo
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: Service parameter data-type used in the following operations:                                                    getCFItem                            getCFItemAssociations                            getCFAssociation                            getCFRubric                            getAllCFDocuments                            getCFDocument                            getCFPackage                            getCFConcept                            getCFSubject                            getCFLicense                            getCFItemType                            getCFAssociationGrouping                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    imsx_codeMajor                            imsx_severity                            imsx_description                            imsx_codeMinor                                            
* Descriptor: Description
  * Definition: This is the container for the status code and associated information returned within the HTTP messages received from the Service Provider. For the CASE service this object will only be returned to provide information about a failed request i.e. it will NOT be in the payload for a successful request. See Appendix B for further information on the interpretation of the information contained within this class


### 6.14.1 "imsx\_codeMajor" Attribute Description

The description of the "imsx\_codeMajor" attribute for the "imsx\_StatusInfo" class is given in Table 6.14.1.


Table 6.14.1 Description of the "imsx_codeMajor" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_codeMajor
* Descriptor: Data Type
  * Definition: imsx_CodeMajorEnum
* Descriptor: Value Space
  * Definition: Enumerated value set of: { success | processing | failure | unsupported }
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The code major value (from the corresponding enumerated vocabulary). See Appendix B for further information on the interpretation of this set of codes.


### 6.14.2 "imsx\_severity" Attribute Description

The description of the "imsx\_severity" attribute for the "imsx\_StatusInfo" class is given in Table 6.14.2.


Table 6.14.2 Description of the "imsx_severity" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_severity
* Descriptor: Data Type
  * Definition: imsx_SeverityEnum
* Descriptor: Value Space
  * Definition: Enumerated value set of: { status | warning | error }
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The severity value (from the corresponding enumerated vocabulary). See Appendix B for further information on the interpretation of this set of codes.


### 6.14.3 "imsx\_description" Attribute Description

The description of the "imsx\_description" attribute for the "imsx\_StatusInfo" class is given in Table 6.14.3.


Table 6.14.3 Description of the "imsx_description" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_description
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human readable description supplied by the entity creating the status code information.


### 6.14.4 "imsx\_codeMinor" Attribute Description

The description of the "imsx\_codeMinor" attribute for the "imsx\_StatusInfo" class is given in Table 6.14.4.


Table 6.14.4 Description of the "imsx_codeMinor" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_codeMinor
* Descriptor: Data Type
  * Definition: imsx_CodeMinor
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of reported code minor status codes. See Appendix B for further information on the interpretation of this set of codes.


[toc](#toc) | [top](#top)

* * *

7\. Data Model
--------------

7.1. Data Class Descriptions
----------------------------

This Section is NORMATIVE.

All of the data classes used within this Information Model are described in this Section. The syntax and semantics for this representation is described in [Appendix A3.2](#AppA3.2).

### 7.1.1 CFAssociation Class Description

The data model for the "CFAssociation" class is shown in Figure 7.1.1 and the accompanying definition in Table 7.1.1.

![UML diagram of the CFAssociation class.](files/figures/FigDataClass_DataModel_CFAssociation.svg)

Figure 7.1.1 - CFAssociation class definitions.


Table 7.1.1 Description of the "CFAssociation" class.


* Descriptor: Class Name
  * Definition: CFAssociation
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    CFPckgAssociation                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocumentURI                                                The set of directly inherited children attributes are:                                                    identifier                            associationType                            sequenceNumber                            uri                            originNodeURI                            destinationNodeURI                            CFAssociationGroupingURI                            lastChangeDateTime                            notes                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    CFDocumentURI                                            
* Descriptor: Description
  * Definition: This is the container for the data about the relationship between two CFDocuments or between two CFItems outside of the context of a CFPackage or CFItem.


#### 7.1.1.1 "CFDocumentURI" Attribute Description

The description of the "CFDocumentURI" attribute for the "CFAssociation" class is given in Table 7.1.1.1.


Table 7.1.1.1 Description of the "CFDocumentURI" attribute for the "CFAssociation" class.


* Descriptor: Attribute Name
  * Definition: CFDocumentURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFDocument that would be used in the context of this CFAssociation using a network-resolvable URI.
* Descriptor: Link Data
  * Definition: This is the URI for the associated CFDocument.See CFDocument for the details about this link.


### 7.1.2 CFAssociationExtension Class Description

The data model for the "CFAssociationExtension" class is shown in Figure 7.1.2 and the accompanying definition in Table 7.1.2.

![UML diagram of the CFAssociationExtension class.](files/figures/FigDataClass_DataModel_CFAssociationExtension.svg)

Figure 7.1.2 - CFAssociationExtension class definitions.


Table 7.1.2 Description of the "CFAssociationExtension" class.


* Descriptor: Class Name
  * Definition: CFAssociationExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPckgAssociation                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFAssociation class.


#### 7.1.2.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFAssociationExtension" class is given in Table 7.1.2.1.


Table 7.1.2.1 Description of the "extensions" attribute for the "CFAssociationExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.3 CFAssociationGrouping Class Description

The data model for the "CFAssociationGrouping" class is shown in Figure 7.1.3 and the accompanying definition in Table 7.1.3.

![UML diagram of the CFAssociationGrouping class.](files/figures/FigDataClass_DataModel_CFAssociationGrouping.svg)

Figure 7.1.3 - CFAssociationGrouping class definitions.


Table 7.1.3 Description of the "CFAssociationGrouping" class.


* Descriptor: Class Name
  * Definition: CFAssociationGrouping
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFDefinition                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            description                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: This is the container for information about a set of associations that have been labelled as a group (the nature of the group being defined by this container).


#### 7.1.3.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFAssociationGrouping" class is given in Table 7.1.3.1.


Table 7.1.3.1 Description of the "identifier" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFAssociationGrouping. This is the primary way in which the exchange identification is achieved.


#### 7.1.3.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFAssociationGrouping" class is given in Table 7.1.3.2.


Table 7.1.3.2 Description of the "uri" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: uri
* Descriptor: Data Type
  * Definition: AnyURI (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFAssociationGrouping using a network-resolvable URI. 


#### 7.1.3.3 "title" Attribute Description

The description of the "title" attribute for the "CFAssociationGrouping" class is given in Table 7.1.3.3.


Table 7.1.3.3 Description of the "title" attribute for the "CFAssociationGrouping" class.

|Descriptor    |Definition                             |
|--------------|---------------------------------------|
|Attribute Name|title                                  |
|Data Type     |NormalizedString (Primitive-type)      |
|Value Space   |See Appendix A3.3.                     |
|Scope         |Local ("-")                            |
|Multiplicity  |[1]                                    |
|Privacy       |There are NO privacy implications.     |
|Description   |The title of the CFAssociationGrouping.|


#### 7.1.3.4 "description" Attribute Description

The description of the "description" attribute for the "CFAssociationGrouping" class is given in Table 7.1.3.4.


Table 7.1.3.4 Description of the "description" attribute for the "CFAssociationGrouping" class.

|Descriptor    |Definition                                                |
|--------------|----------------------------------------------------------|
|Attribute Name|description                                               |
|Data Type     |String (Primitive-type)                                   |
|Value Space   |See Appendix A3.3.                                        |
|Scope         |Local ("-")                                               |
|Multiplicity  |[0..1]                                                    |
|Privacy       |There are NO privacy implications.                        |
|Description   |A human readable description of the CFAssociationGrouping.|


#### 7.1.3.5 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFAssociationGrouping" class is given in Table 7.1.3.5.


Table 7.1.3.5 Description of the "lastChangeDateTime" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.3.6 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFAssociationGrouping" class is given in Table 7.1.3.6.


Table 7.1.3.6 Description of the "extensions" attribute for the "CFAssociationGrouping" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFAssociationGroupingExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.4 CFAssociationGroupingExtension Class Description

The data model for the "CFAssociationGroupingExtension" class is shown in Figure 7.1.4 and the accompanying definition in Table 7.1.4.

![UML diagram of the CFAssociationGroupingExtension class.](files/figures/FigDataClass_DataModel_CFAssociationGroupingExtension.svg)

Figure 7.1.4 - CFAssociationGroupingExtension class definitions.


Table 7.1.4 Description of the "CFAssociationGroupingExtension" class.


* Descriptor: Class Name
  * Definition: CFAssociationGroupingExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFAssociationGrouping                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFAssociationGrouping class.


#### 7.1.4.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFAssociationGroupingExtension" class is given in Table 7.1.4.1.


Table 7.1.4.1 Description of the "extensions" attribute for the "CFAssociationGroupingExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.5 CFAssociationSet Class Description

The data model for the "CFAssociationSet" class is shown in Figure 7.1.5 and the accompanying definition in Table 7.1.5.

![UML diagram of the CFAssociationSet class.](files/figures/FigDataClass_DataModel_CFAssociationSet.svg)

Figure 7.1.5 - CFAssociationSet class definitions.


Table 7.1.5 Description of the "CFAssociationSet" class.


* Descriptor: Class Name
  * Definition: CFAssociationSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFItem                            CFAssociations                                            
* Descriptor: Description
  * Definition: This is the container for a collection of CFAssociations. There must be at least one CFAssociation. Note that the association can be between CFDocuments or between CFItems.


#### 7.1.5.1 "CFItem" Attribute Description

The description of the "CFItem" attribute for the "CFAssociationSet" class is given in Table 7.1.5.1.


Table 7.1.5.1 Description of the "CFItem" attribute for the "CFAssociationSet" class.


* Descriptor: Attribute Name
  * Definition: CFItem
* Descriptor: Data Type
  * Definition: CFItem
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is the container for the specified CFItem object. This is the content that either describes a specific competency (learning objective) or describes a grouping of competencies within the taxonomy of a Competency Framework Document. 


#### 7.1.5.2 "CFAssociations" Attribute Description

The description of the "CFAssociations" attribute for the "CFAssociationSet" class is given in Table 7.1.5.2.


Table 7.1.5.2 Description of the "CFAssociations" attribute for the "CFAssociationSet" class.


* Descriptor: Attribute Name
  * Definition: CFAssociations
* Descriptor: Data Type
  * Definition: CFPckgAssociation
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is the data for a single CFAssociation within the CFAssociationSet container. The association can be between CFDocuments or between CFItems


### 7.1.6 CFConcept Class Description

The data model for the "CFConcept" class is shown in Figure 7.1.6 and the accompanying definition in Table 7.1.6.

![UML diagram of the CFConcept class.](files/figures/FigDataClass_DataModel_CFConcept.svg)

Figure 7.1.6 - CFConcept class definitions.


Table 7.1.6 Description of the "CFConcept" class.


* Descriptor: Class Name
  * Definition: CFConcept
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFConceptSet                            CFDefinition                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            keywords                            hierarchyCode                            description                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: The container for the definition of a concept which is addressed by the competency framework.


#### 7.1.6.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFConcept" class is given in Table 7.1.6.1.


Table 7.1.6.1 Description of the "identifier" attribute for the "CFConcept" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFConcept. This is the primary way in which the exchange identification is achieved.


#### 7.1.6.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFConcept" class is given in Table 7.1.6.2.


Table 7.1.6.2 Description of the "uri" attribute for the "CFConcept" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|uri                                                                       |
|Data Type     |AnyURI (Primitive-type)                                                   |
|Value Space   |See Appendix A3.3.                                                        |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[1]                                                                       |
|Privacy       |There are NO privacy implications.                                        |
|Description   |An unambiguous reference to the CFConcept using a network-resolvable URI. |


#### 7.1.6.3 "title" Attribute Description

The description of the "title" attribute for the "CFConcept" class is given in Table 7.1.6.3.


Table 7.1.6.3 Description of the "title" attribute for the "CFConcept" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[1]                               |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFConcept.       |


#### 7.1.6.4 "keywords" Attribute Description

The description of the "keywords" attribute for the "CFConcept" class is given in Table 7.1.6.4.


Table 7.1.6.4 Description of the "keywords" attribute for the "CFConcept" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|keywords                                                                  |
|Data Type     |NormalizedString (Primitive-type)                                         |
|Value Space   |See Appendix A3.3.                                                        |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[0..1]                                                                    |
|Privacy       |There are NO privacy implications.                                        |
|Description   |Defined listing of keywords delimited by ']' that the concept encompasses.|


#### 7.1.6.5 "hierarchyCode" Attribute Description

The description of the "hierarchyCode" attribute for the "CFConcept" class is given in Table 7.1.6.5.


Table 7.1.6.5 Description of the "hierarchyCode" attribute for the "CFConcept" class.


* Descriptor: Attribute Name
  * Definition: hierarchyCode
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human-referenceable code designated by the publisher to identify the item in the hierarchy of the Concepts.


#### 7.1.6.6 "description" Attribute Description

The description of the "description" attribute for the "CFConcept" class is given in Table 7.1.6.6.


Table 7.1.6.6 Description of the "description" attribute for the "CFConcept" class.

|Descriptor    |Definition                                    |
|--------------|----------------------------------------------|
|Attribute Name|description                                   |
|Data Type     |String (Primitive-type)                       |
|Value Space   |See Appendix A3.3.                            |
|Scope         |Local ("-")                                   |
|Multiplicity  |[0..1]                                        |
|Privacy       |There are NO privacy implications.            |
|Description   |A human readable description of the CFConcept.|


#### 7.1.6.7 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFConcept" class is given in Table 7.1.6.7.


Table 7.1.6.7 Description of the "lastChangeDateTime" attribute for the "CFConcept" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.6.8 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFConcept" class is given in Table 7.1.6.8.


Table 7.1.6.8 Description of the "extensions" attribute for the "CFConcept" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFConceptExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.7 CFConceptExtension Class Description

The data model for the "CFConceptExtension" class is shown in Figure 7.1.7 and the accompanying definition in Table 7.1.7.

![UML diagram of the CFConceptExtension class.](files/figures/FigDataClass_DataModel_CFConceptExtension.svg)

Figure 7.1.7 - CFConceptExtension class definitions.


Table 7.1.7 Description of the "CFConceptExtension" class.


* Descriptor: Class Name
  * Definition: CFConceptExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFConcept                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFConcept class.


#### 7.1.7.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFConceptExtension" class is given in Table 7.1.7.1.


Table 7.1.7.1 Description of the "extensions" attribute for the "CFConceptExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.8 CFConceptSet Class Description

The data model for the "CFConceptSet" class is shown in Figure 7.1.8 and the accompanying definition in Table 7.1.8.

![UML diagram of the CFConceptSet class.](files/figures/FigDataClass_DataModel_CFConceptSet.svg)

Figure 7.1.8 - CFConceptSet class definitions.


Table 7.1.8 Description of the "CFConceptSet" class.


* Descriptor: Class Name
  * Definition: CFConceptSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFConcepts                                            
* Descriptor: Description
  * Definition: The container for the set of CFConcepts supplied in the response payload. The relationship between the CFConcepts is determined by the 'hierarchyCode'. The first CFConcept is that which has been specified in the call. The other CFConcepts are the set of children as determined by their place in the 'hierarchyCode' of the CFConcept.


#### 7.1.8.1 "CFConcepts" Attribute Description

The description of the "CFConcepts" attribute for the "CFConceptSet" class is given in Table 7.1.8.1.


Table 7.1.8.1 Description of the "CFConcepts" attribute for the "CFConceptSet" class.


* Descriptor: Attribute Name
  * Definition: CFConcepts
* Descriptor: Data Type
  * Definition: CFConcept
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFConcepts. The relationship between the CFConcepts is determined by the 'hierarchyCode'. The first CFConcept is that which has been specified in the call. The other CFConcepts are the set of children as determined by their place in the 'hierarchyCode' of the CFConcept.


### 7.1.9 CFDefinition Class Description

The data model for the "CFDefinition" class is shown in Figure 7.1.9 and the accompanying definition in Table 7.1.9.

![UML diagram of the CFDefinition class.](files/figures/FigDataClass_DataModel_CFDefinition.svg)

Figure 7.1.9 - CFDefinition class definitions.


Table 7.1.9 Description of the "CFDefinition" class.


* Descriptor: Class Name
  * Definition: CFDefinition
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPackage                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFConcepts                            CFSubjects                            CFLicenses                            CFItemTypes                            CFAssociationGroupings                            extensions                                            
* Descriptor: Description
  * Definition: The container for the set of definitions used for the competency framework i.e. the set of CFSubjects, CFConcepts, CFItemTypes, CFAssociationGroupings and CFLicenses.


#### 7.1.9.1 "CFConcepts" Attribute Description

The description of the "CFConcepts" attribute for the "CFDefinition" class is given in Table 7.1.9.1.


Table 7.1.9.1 Description of the "CFConcepts" attribute for the "CFDefinition" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|CFConcepts                        |
|Data Type     |CFConcept                         |
|Value Space   |Container [  Unordered  ]         |
|Scope         |Local ("-")                       |
|Multiplicity  |[0.. unbounded]                   |
|Privacy       |There are NO privacy implications.|
|Description   |The set of concept definitions.   |


#### 7.1.9.2 "CFSubjects" Attribute Description

The description of the "CFSubjects" attribute for the "CFDefinition" class is given in Table 7.1.9.2.


Table 7.1.9.2 Description of the "CFSubjects" attribute for the "CFDefinition" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|CFSubjects                        |
|Data Type     |CFSubject                         |
|Value Space   |Container [  Unordered  ]         |
|Scope         |Local ("-")                       |
|Multiplicity  |[0.. unbounded]                   |
|Privacy       |There are NO privacy implications.|
|Description   |The set of subject definitions.   |


#### 7.1.9.3 "CFLicenses" Attribute Description

The description of the "CFLicenses" attribute for the "CFDefinition" class is given in Table 7.1.9.3.


Table 7.1.9.3 Description of the "CFLicenses" attribute for the "CFDefinition" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|CFLicenses                        |
|Data Type     |CFLicense                         |
|Value Space   |Container [  Unordered  ]         |
|Scope         |Local ("-")                       |
|Multiplicity  |[0.. unbounded]                   |
|Privacy       |There are NO privacy implications.|
|Description   |The set of license definitions.   |


#### 7.1.9.4 "CFItemTypes" Attribute Description

The description of the "CFItemTypes" attribute for the "CFDefinition" class is given in Table 7.1.9.4.


Table 7.1.9.4 Description of the "CFItemTypes" attribute for the "CFDefinition" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|CFItemTypes                       |
|Data Type     |CFItemType                        |
|Value Space   |Container [  Unordered  ]         |
|Scope         |Local ("-")                       |
|Multiplicity  |[0.. unbounded]                   |
|Privacy       |There are NO privacy implications.|
|Description   |The set of item type definitions. |


#### 7.1.9.5 "CFAssociationGroupings" Attribute Description

The description of the "CFAssociationGroupings" attribute for the "CFDefinition" class is given in Table 7.1.9.5.


Table 7.1.9.5 Description of the "CFAssociationGroupings" attribute for the "CFDefinition" class.

|Descriptor    |Definition                                  |
|--------------|--------------------------------------------|
|Attribute Name|CFAssociationGroupings                      |
|Data Type     |CFAssociationGrouping                       |
|Value Space   |Container [  Unordered  ]                   |
|Scope         |Local ("-")                                 |
|Multiplicity  |[0.. unbounded]                             |
|Privacy       |There are NO privacy implications.          |
|Description   |The set of association grouping definitions.|


#### 7.1.9.6 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFDefinition" class is given in Table 7.1.9.6.


Table 7.1.9.6 Description of the "extensions" attribute for the "CFDefinition" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFDefinitionExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.10 CFDefinitionExtension Class Description

The data model for the "CFDefinitionExtension" class is shown in Figure 7.1.10 and the accompanying definition in Table 7.1.10.

![UML diagram of the CFDefinitionExtension class.](files/figures/FigDataClass_DataModel_CFDefinitionExtension.svg)

Figure 7.1.10 - CFDefinitionExtension class definitions.


Table 7.1.10 Description of the "CFDefinitionExtension" class.


* Descriptor: Class Name
  * Definition: CFDefinitionExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFDefinition                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFDefinition class.


#### 7.1.10.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFDefinitionExtension" class is given in Table 7.1.10.1.


Table 7.1.10.1 Description of the "extensions" attribute for the "CFDefinitionExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.11 CFDocument Class Description

The data model for the "CFDocument" class is shown in Figure 7.1.11 and the accompanying definition in Table 7.1.11.

![UML diagram of the CFDocument class.](files/figures/FigDataClass_DataModel_CFDocument.svg)

Figure 7.1.11 - CFDocument class definitions.


Table 7.1.11 Description of the "CFDocument" class.


* Descriptor: Class Name
  * Definition: CFDocument
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFDocumentSet                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    CFPckgDocument                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFPackageURI                                                The set of directly inherited children attributes are:                                                    identifier                            uri                            frameworkType                            caseVersion                            creator                            title                            lastChangeDateTime                            officialSourceURL                            publisher                            description                            subject                            subjectURI                            language                            version                            adoptionStatus                            statusStartDate                            statusEndDate                            licenseURI                            notes                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    CFPackageURI                                            
* Descriptor: Description
  * Definition: The container for the data about a competency framework document (CFDocument) when exchanged outside of the context of a CFPackage. A CFDocument is the root for the creation of a learning standard/competency.


#### 7.1.11.1 "CFPackageURI" Attribute Description

The description of the "CFPackageURI" attribute for the "CFDocument" class is given in Table 7.1.11.1.


Table 7.1.11.1 Description of the "CFPackageURI" attribute for the "CFDocument" class.


* Descriptor: Attribute Name
  * Definition: CFPackageURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFPackage that would be used to contain this CFDocument using a network-resolvable URI.
* Descriptor: Link Data
  * Definition: This is the URI for the associated CFPackage.See CFPackage for the details about this link.


### 7.1.12 CFDocumentExtension Class Description

The data model for the "CFDocumentExtension" class is shown in Figure 7.1.12 and the accompanying definition in Table 7.1.12.

![UML diagram of the CFDocumentExtension class.](files/figures/FigDataClass_DataModel_CFDocumentExtension.svg)

Figure 7.1.12 - CFDocumentExtension class definitions.


Table 7.1.12 Description of the "CFDocumentExtension" class.


* Descriptor: Class Name
  * Definition: CFDocumentExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPckgDocument                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFDocument class.


#### 7.1.12.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFDocumentExtension" class is given in Table 7.1.12.1.


Table 7.1.12.1 Description of the "extensions" attribute for the "CFDocumentExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.13 CFDocumentSet Class Description

The data model for the "CFDocumentSet" class is shown in Figure 7.1.13 and the accompanying definition in Table 7.1.13.

![UML diagram of the CFDocumentSet class.](files/figures/FigDataClass_DataModel_CFDocumentSet.svg)

Figure 7.1.13 - CFDocumentSet class definitions.


Table 7.1.13 Description of the "CFDocumentSet" class.


* Descriptor: Class Name
  * Definition: CFDocumentSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocuments                                            
* Descriptor: Description
  * Definition: This is the container for a collection of CFDocuments. There must be at least one CFDocument.


#### 7.1.13.1 "CFDocuments" Attribute Description

The description of the "CFDocuments" attribute for the "CFDocumentSet" class is given in Table 7.1.13.1.


Table 7.1.13.1 Description of the "CFDocuments" attribute for the "CFDocumentSet" class.

|Descriptor    |Definition                                                                  |
|--------------|----------------------------------------------------------------------------|
|Attribute Name|CFDocuments                                                                 |
|Data Type     |CFDocument                                                                  |
|Value Space   |Container [  Unordered  ]                                                   |
|Scope         |Local ("-")                                                                 |
|Multiplicity  |[1.. unbounded]                                                             |
|Privacy       |There are NO privacy implications.                                          |
|Description   |This is the data for a single CFDocument within the CFDocumentSet container.|


### 7.1.14 CFItem Class Description

The data model for the "CFItem" class is shown in Figure 7.1.14 and the accompanying definition in Table 7.1.14.

![UML diagram of the CFItem class.](files/figures/FigDataClass_DataModel_CFItem.svg)

Figure 7.1.14 - CFItem class definitions.


Table 7.1.14 Description of the "CFItem" class.


* Descriptor: Class Name
  * Definition: CFItem
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFAssociationSet                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    CFPckgItem                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocumentURI                                                The set of directly inherited children attributes are:                                                    identifier                            fullStatement                            alternativeLabel                            CFItemType                            uri                            humanCodingScheme                            listEnumeration                            abbreviatedStatement                            conceptKeywords                            conceptKeywordsURI                            notes                            subject                            subjectURI                            language                            educationLevel                            CFItemTypeURI                            licenseURI                            statusStartDate                            statusEndDate                            lastChangeDateTime                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    CFDocumentURI                                            
* Descriptor: Description
  * Definition: This is the container for the CFItem data outside of the context of a CFPackage. This is the content that either describes a specific competency (learning objective) or describes a grouping of competencies within the taxonomy of a Competency Framework Document. 


#### 7.1.14.1 "CFDocumentURI" Attribute Description

The description of the "CFDocumentURI" attribute for the "CFItem" class is given in Table 7.1.14.1.


Table 7.1.14.1 Description of the "CFDocumentURI" attribute for the "CFItem" class.


* Descriptor: Attribute Name
  * Definition: CFDocumentURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFDocument that would be used to contain this CFItem using a network-resolvable URI.
* Descriptor: Link Data
  * Definition: This is the URI for the associated CFDocument.See CFDocument for the details about this link.


### 7.1.15 CFItemExtension Class Description

The data model for the "CFItemExtension" class is shown in Figure 7.1.15 and the accompanying definition in Table 7.1.15.

![UML diagram of the CFItemExtension class.](files/figures/FigDataClass_DataModel_CFItemExtension.svg)

Figure 7.1.15 - CFItemExtension class definitions.


Table 7.1.15 Description of the "CFItemExtension" class.


* Descriptor: Class Name
  * Definition: CFItemExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPckgItem                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFItem class.


#### 7.1.15.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFItemExtension" class is given in Table 7.1.15.1.


Table 7.1.15.1 Description of the "extensions" attribute for the "CFItemExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.16 CFItemType Class Description

The data model for the "CFItemType" class is shown in Figure 7.1.16 and the accompanying definition in Table 7.1.16.

![UML diagram of the CFItemType class.](files/figures/FigDataClass_DataModel_CFItemType.svg)

Figure 7.1.16 - CFItemType class definitions.


Table 7.1.16 Description of the "CFItemType" class.


* Descriptor: Class Name
  * Definition: CFItemType
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFDefinition                            CFItemTypeSet                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            description                            hierarchyCode                            typeCode                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: The container for the ItemType information use within the competency framework.


#### 7.1.16.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFItemType" class is given in Table 7.1.16.1.


Table 7.1.16.1 Description of the "identifier" attribute for the "CFItemType" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFItemType. This is the primary way in which the exchange identification is achieved.


#### 7.1.16.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFItemType" class is given in Table 7.1.16.2.


Table 7.1.16.2 Description of the "uri" attribute for the "CFItemType" class.

|Descriptor    |Definition                                                                 |
|--------------|---------------------------------------------------------------------------|
|Attribute Name|uri                                                                        |
|Data Type     |AnyURI (Primitive-type)                                                    |
|Value Space   |See Appendix A3.3.                                                         |
|Scope         |Local ("-")                                                                |
|Multiplicity  |[1]                                                                        |
|Privacy       |There are NO privacy implications.                                         |
|Description   |An unambiguous reference to the CFItemType using a network-resolvable URI. |


#### 7.1.16.3 "title" Attribute Description

The description of the "title" attribute for the "CFItemType" class is given in Table 7.1.16.3.


Table 7.1.16.3 Description of the "title" attribute for the "CFItemType" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[1]                               |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFItemType.      |


#### 7.1.16.4 "description" Attribute Description

The description of the "description" attribute for the "CFItemType" class is given in Table 7.1.16.4.


Table 7.1.16.4 Description of the "description" attribute for the "CFItemType" class.

|Descriptor    |Definition                                     |
|--------------|-----------------------------------------------|
|Attribute Name|description                                    |
|Data Type     |String (Primitive-type)                        |
|Value Space   |See Appendix A3.3.                             |
|Scope         |Local ("-")                                    |
|Multiplicity  |[1]                                            |
|Privacy       |There are NO privacy implications.             |
|Description   |A human readable description of the CFItemType.|


#### 7.1.16.5 "hierarchyCode" Attribute Description

The description of the "hierarchyCode" attribute for the "CFItemType" class is given in Table 7.1.16.5.


Table 7.1.16.5 Description of the "hierarchyCode" attribute for the "CFItemType" class.


* Descriptor: Attribute Name
  * Definition: hierarchyCode
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human-referenceable code designated by the publisher to identify the item in the hierarchy of ItemTypes.


#### 7.1.16.6 "typeCode" Attribute Description

The description of the "typeCode" attribute for the "CFItemType" class is given in Table 7.1.16.6.


Table 7.1.16.6 Description of the "typeCode" attribute for the "CFItemType" class.

|Descriptor    |Definition                             |
|--------------|---------------------------------------|
|Attribute Name|typeCode                               |
|Data Type     |NormalizedString (Primitive-type)      |
|Value Space   |See Appendix A3.3.                     |
|Scope         |Local ("-")                            |
|Multiplicity  |[0..1]                                 |
|Privacy       |There are NO privacy implications.     |
|Description   |Text code used for type identification.|


#### 7.1.16.7 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFItemType" class is given in Table 7.1.16.7.


Table 7.1.16.7 Description of the "lastChangeDateTime" attribute for the "CFItemType" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.16.8 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFItemType" class is given in Table 7.1.16.8.


Table 7.1.16.8 Description of the "extensions" attribute for the "CFItemType" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFItemTypeExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.17 CFItemTypeExtension Class Description

The data model for the "CFItemTypeExtension" class is shown in Figure 7.1.17 and the accompanying definition in Table 7.1.17.

![UML diagram of the CFItemTypeExtension class.](files/figures/FigDataClass_DataModel_CFItemTypeExtension.svg)

Figure 7.1.17 - CFItemTypeExtension class definitions.


Table 7.1.17 Description of the "CFItemTypeExtension" class.


* Descriptor: Class Name
  * Definition: CFItemTypeExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFItemType                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFItemType class.


#### 7.1.17.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFItemTypeExtension" class is given in Table 7.1.17.1.


Table 7.1.17.1 Description of the "extensions" attribute for the "CFItemTypeExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.18 CFItemTypeSet Class Description

The data model for the "CFItemTypeSet" class is shown in Figure 7.1.18 and the accompanying definition in Table 7.1.18.

![UML diagram of the CFItemTypeSet class.](files/figures/FigDataClass_DataModel_CFItemTypeSet.svg)

Figure 7.1.18 - CFItemTypeSet class definitions.


Table 7.1.18 Description of the "CFItemTypeSet" class.


* Descriptor: Class Name
  * Definition: CFItemTypeSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFItemTypes                                            
* Descriptor: Description
  * Definition: The container for the set of CFItemTypes supplied in the response payload. The relationship between the CFItemTypes is determined by the 'hierarchyCode'. The first CFItemType is that which has been specified in the call. The other CFItemTypes are the set of children as determined by their place in the 'hierarchyCode' of the CFItemType.


#### 7.1.18.1 "CFItemTypes" Attribute Description

The description of the "CFItemTypes" attribute for the "CFItemTypeSet" class is given in Table 7.1.18.1.


Table 7.1.18.1 Description of the "CFItemTypes" attribute for the "CFItemTypeSet" class.


* Descriptor: Attribute Name
  * Definition: CFItemTypes
* Descriptor: Data Type
  * Definition: CFItemType
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFItemTypes. The relationship between the CFItemTypes is determined by the 'hierarchyCode'. The first CFItemType is that which has been specified in the call. The other CFItemTypes are the set of children as determined by their place in the 'hierarchyCode' of the CFItemType.


### 7.1.19 CFLicense Class Description

The data model for the "CFLicense" class is shown in Figure 7.1.19 and the accompanying definition in Table 7.1.19.

![UML diagram of the CFLicense class.](files/figures/FigDataClass_DataModel_CFLicense.svg)

Figure 7.1.19 - CFLicense class definitions.


Table 7.1.19 Description of the "CFLicense" class.


* Descriptor: Class Name
  * Definition: CFLicense
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFDefinition                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            description                            licenseText                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: The container for the information about a license used within the competency framework.


#### 7.1.19.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFLicense" class is given in Table 7.1.19.1.


Table 7.1.19.1 Description of the "identifier" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFLicense. This is the primary way in which the exchange identification is achieved.


#### 7.1.19.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFLicense" class is given in Table 7.1.19.2.


Table 7.1.19.2 Description of the "uri" attribute for the "CFLicense" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|uri                                                                       |
|Data Type     |AnyURI (Primitive-type)                                                   |
|Value Space   |See Appendix A3.3.                                                        |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[1]                                                                       |
|Privacy       |There are NO privacy implications.                                        |
|Description   |An unambiguous reference to the CFLicense using a network-resolvable URI. |


#### 7.1.19.3 "title" Attribute Description

The description of the "title" attribute for the "CFLicense" class is given in Table 7.1.19.3.


Table 7.1.19.3 Description of the "title" attribute for the "CFLicense" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[1]                               |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFLicense.       |


#### 7.1.19.4 "description" Attribute Description

The description of the "description" attribute for the "CFLicense" class is given in Table 7.1.19.4.


Table 7.1.19.4 Description of the "description" attribute for the "CFLicense" class.

|Descriptor    |Definition                                    |
|--------------|----------------------------------------------|
|Attribute Name|description                                   |
|Data Type     |String (Primitive-type)                       |
|Value Space   |See Appendix A3.3.                            |
|Scope         |Local ("-")                                   |
|Multiplicity  |[0..1]                                        |
|Privacy       |There are NO privacy implications.            |
|Description   |A human readable description of the CFLicense.|


#### 7.1.19.5 "licenseText" Attribute Description

The description of the "licenseText" attribute for the "CFLicense" class is given in Table 7.1.19.5.


Table 7.1.19.5 Description of the "licenseText" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: licenseText
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: Legal license text used by the organization to convey license permissions. This may include the actual license text, or a link to a web location containing the license as a document or as text.


#### 7.1.19.6 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFLicense" class is given in Table 7.1.19.6.


Table 7.1.19.6 Description of the "lastChangeDateTime" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.19.7 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFLicense" class is given in Table 7.1.19.7.


Table 7.1.19.7 Description of the "extensions" attribute for the "CFLicense" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFLicenseExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.20 CFLicenseExtension Class Description

The data model for the "CFLicenseExtension" class is shown in Figure 7.1.20 and the accompanying definition in Table 7.1.20.

![UML diagram of the CFLicenseExtension class.](files/figures/FigDataClass_DataModel_CFLicenseExtension.svg)

Figure 7.1.20 - CFLicenseExtension class definitions.


Table 7.1.20 Description of the "CFLicenseExtension" class.


* Descriptor: Class Name
  * Definition: CFLicenseExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFLicense                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFLicense class.


#### 7.1.20.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFLicenseExtension" class is given in Table 7.1.20.1.


Table 7.1.20.1 Description of the "extensions" attribute for the "CFLicenseExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.21 CFPackage Class Description

The data model for the "CFPackage" class is shown in Figure 7.1.21 and the accompanying definition in Table 7.1.21.

![UML diagram of the CFPackage class.](files/figures/FigDataClass_DataModel_CFPackage.svg)

Figure 7.1.21 - CFPackage class definitions.


Table 7.1.21 Description of the "CFPackage" class.


* Descriptor: Class Name
  * Definition: CFPackage
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFDocument                            CFItems                            CFAssociations                            CFDefinitions                            CFRubrics                            extensions                                            
* Descriptor: Description
  * Definition: This is the container for all of the data for a Competency Framework Package i.e. the root CFDocument and ALL of the corresponding components i.e. the CFItems, CFAssociations and CFDefinitions.


#### 7.1.21.1 "CFDocument" Attribute Description

The description of the "CFDocument" attribute for the "CFPackage" class is given in Table 7.1.21.1.


Table 7.1.21.1 Description of the "CFDocument" attribute for the "CFPackage" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|CFDocument                                                                |
|Data Type     |CFPckgDocument                                                            |
|Value Space   |Container [  Unordered  ]                                                 |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[1]                                                                       |
|Privacy       |There are NO privacy implications.                                        |
|Description   |The root Competency Framework Document. There must be only one CFDocument.|


#### 7.1.21.2 "CFItems" Attribute Description

The description of the "CFItems" attribute for the "CFPackage" class is given in Table 7.1.21.2.


Table 7.1.21.2 Description of the "CFItems" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFItems
* Descriptor: Data Type
  * Definition: CFPckgItem
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of Competency Framework Items that are a components (direct or indirect children) of the root Competency Framework Document. There must be at least one Competency Framework Item.


#### 7.1.21.3 "CFAssociations" Attribute Description

The description of the "CFAssociations" attribute for the "CFPackage" class is given in Table 7.1.21.3.


Table 7.1.21.3 Description of the "CFAssociations" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFAssociations
* Descriptor: Data Type
  * Definition: CFPckgAssociation
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of Competency Framework Associations. This includes: the set of associations between the component CFItems and other CFItems; the set of associations between the root CFDocument and other CFDocuments.


#### 7.1.21.4 "CFDefinitions" Attribute Description

The description of the "CFDefinitions" attribute for the "CFPackage" class is given in Table 7.1.21.4.


Table 7.1.21.4 Description of the "CFDefinitions" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFDefinitions
* Descriptor: Data Type
  * Definition: CFDefinition
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The Competency Framework Definitions for the CFDocument and the associated component CFItems. The definitions contains the corresponding set of: CFConcepts, CFSubjects, CFLicenses, CFItemTypes and CFAssociationGroupings.


#### 7.1.21.5 "CFRubrics" Attribute Description

The description of the "CFRubrics" attribute for the "CFPackage" class is given in Table 7.1.21.5.


Table 7.1.21.5 Description of the "CFRubrics" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: CFRubrics
* Descriptor: Data Type
  * Definition: CFRubric
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of Competency Framework CFRubrics including the associated CFRubricCriteria and CFRubrcCriterionLevels that are required to complete all of the information relevant to the parent CFRubric. 


#### 7.1.21.6 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFPackage" class is given in Table 7.1.21.6.


Table 7.1.21.6 Description of the "extensions" attribute for the "CFPackage" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFPackageExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.22 CFPackageExtension Class Description

The data model for the "CFPackageExtension" class is shown in Figure 7.1.22 and the accompanying definition in Table 7.1.22.

![UML diagram of the CFPackageExtension class.](files/figures/FigDataClass_DataModel_CFPackageExtension.svg)

Figure 7.1.22 - CFPackageExtension class definitions.


Table 7.1.22 Description of the "CFPackageExtension" class.


* Descriptor: Class Name
  * Definition: CFPackageExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPackage                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFPackage class.


#### 7.1.22.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFPackageExtension" class is given in Table 7.1.22.1.


Table 7.1.22.1 Description of the "extensions" attribute for the "CFPackageExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.23 CFPckgAssociation Class Description

The data model for the "CFPckgAssociation" class is shown in Figure 7.1.23 and the accompanying definition in Table 7.1.23.

![UML diagram of the CFPckgAssociation class.](files/figures/FigDataClass_DataModel_CFPckgAssociation.svg)

Figure 7.1.23 - CFPckgAssociation class definitions.


Table 7.1.23 Description of the "CFPckgAssociation" class.


* Descriptor: Class Name
  * Definition: CFPckgAssociation
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFAssociationSet                            CFPackage                                            
* Descriptor: Derived Classes
  * Definition: The set of derived classes are:                                                    CFAssociation                                            
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            associationType                            sequenceNumber                            uri                            originNodeURI                            destinationNodeURI                            CFAssociationGroupingURI                            lastChangeDateTime                            notes                            extensions                                            
* Descriptor: Description
  * Definition: This is the container for the data about the relationship between two CFDocuments or between two CFItems within the context of a CFPackage.


#### 7.1.23.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.1.


Table 7.1.23.1 Description of the "identifier" attribute for the "CFPckgAssociation" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFAssociation. This is the primary way in which the exchange identification is achieved.


#### 7.1.23.2 "associationType" Attribute Description

The description of the "associationType" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.2.


Table 7.1.23.2 Description of the "associationType" attribute for the "CFPckgAssociation" class.


* Descriptor: Attribute Name
  * Definition: associationType
* Descriptor: Data Type
  * Definition: CFAssociationTypeExtEnum
* Descriptor: Value Space
  * Definition: Container [ Union ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The type of association. This uses an extensible enumerated vocabulary. Changed in CASE 1.1.


#### 7.1.23.3 "sequenceNumber" Attribute Description

The description of the "sequenceNumber" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.3.


Table 7.1.23.3 Description of the "sequenceNumber" attribute for the "CFPckgAssociation" class.


* Descriptor: Attribute Name
  * Definition: sequenceNumber
* Descriptor: Data Type
  * Definition: Integer (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is used to order associated objects. Associations can be created through mapping rather than strict hierarchy. As such the presentation of the list cannot be ordered by the objects in the list. They may be different based on the parent being viewed. Use of this property for sequencing is preferred over the use of the 'listEnumeration' property in the CFPckgItem class. 


#### 7.1.23.4 "uri" Attribute Description

The description of the "uri" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.4.


Table 7.1.23.4 Description of the "uri" attribute for the "CFPckgAssociation" class.

|Descriptor    |Definition                                                                   |
|--------------|-----------------------------------------------------------------------------|
|Attribute Name|uri                                                                          |
|Data Type     |AnyURI (Primitive-type)                                                      |
|Value Space   |See Appendix A3.3.                                                           |
|Scope         |Local ("-")                                                                  |
|Multiplicity  |[1]                                                                          |
|Privacy       |There are NO privacy implications.                                           |
|Description   |An unambiguous reference to the CFAssociation using a network-resolvable URI.|


#### 7.1.23.5 "originNodeURI" Attribute Description

The description of the "originNodeURI" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.5.


Table 7.1.23.5 Description of the "originNodeURI" attribute for the "CFPckgAssociation" class.

|Descriptor    |Definition                                    |
|--------------|----------------------------------------------|
|Attribute Name|originNodeURI                                 |
|Data Type     |LinkGenURI                                    |
|Value Space   |Container [  Unordered  ]                     |
|Scope         |Local ("-")                                   |
|Multiplicity  |[1]                                           |
|Privacy       |There are NO privacy implications.            |
|Description   |The resolvable URI for the origin node object.|


#### 7.1.23.6 "destinationNodeURI" Attribute Description

The description of the "destinationNodeURI" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.6.


Table 7.1.23.6 Description of the "destinationNodeURI" attribute for the "CFPckgAssociation" class.

|Descriptor    |Definition                                         |
|--------------|---------------------------------------------------|
|Attribute Name|destinationNodeURI                                 |
|Data Type     |LinkGenURI                                         |
|Value Space   |Container [  Unordered  ]                          |
|Scope         |Local ("-")                                        |
|Multiplicity  |[1]                                                |
|Privacy       |There are NO privacy implications.                 |
|Description   |The resolvable URI for the destination node object.|


#### 7.1.23.7 "CFAssociationGroupingURI" Attribute Description

The description of the "CFAssociationGroupingURI" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.7.


Table 7.1.23.7 Description of the "CFAssociationGroupingURI" attribute for the "CFPckgAssociation" class.


* Descriptor: Attribute Name
  * Definition: CFAssociationGroupingURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The network resolvable URI for the link data relationship to a CFAssociationGrouping.


#### 7.1.23.8 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.8.


Table 7.1.23.8 Description of the "lastChangeDateTime" attribute for the "CFPckgAssociation" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.23.9 "notes" Attribute Description

The description of the "notes" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.9.


Table 7.1.23.9 Description of the "notes" attribute for the "CFPckgAssociation" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|notes                                                                     |
|Data Type     |String (Primitive-type)                                                   |
|Value Space   |See Appendix A3.3.                                                        |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[0..1]                                                                    |
|Privacy       |There are NO privacy implications.                                        |
|Description   |A new attribute added in Version 1.1. Information about the CFAssociation.|


#### 7.1.23.10 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFPckgAssociation" class is given in Table 7.1.23.10.


Table 7.1.23.10 Description of the "extensions" attribute for the "CFPckgAssociation" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFAssociationExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.24 CFPckgDocument Class Description

The data model for the "CFPckgDocument" class is shown in Figure 7.1.24 and the accompanying definition in Table 7.1.24.

![UML diagram of the CFPckgDocument class.](files/figures/FigDataClass_DataModel_CFPckgDocument.svg)

Figure 7.1.24 - CFPckgDocument class definitions.


Table 7.1.24 Description of the "CFPckgDocument" class.


* Descriptor: Class Name
  * Definition: CFPckgDocument
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPackage                                            
* Descriptor: Derived Classes
  * Definition: The set of derived classes are:                                                    CFDocument                                            
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            frameworkType                            caseVersion                            creator                            title                            lastChangeDateTime                            officialSourceURL                            publisher                            description                            subject                            subjectURI                            language                            version                            adoptionStatus                            statusStartDate                            statusEndDate                            licenseURI                            notes                            extensions                                            
* Descriptor: Description
  * Definition: The container for the data about a competency framework document (CFDocument) within a CFPackage. A CFDocument is the root for the creation of a learning standard/competency.


#### 7.1.24.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFPckgDocument" class is given in Table 7.1.24.1.


Table 7.1.24.1 Description of the "identifier" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFDocument. This is the primary way in which the exchange identification is achieved.


#### 7.1.24.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFPckgDocument" class is given in Table 7.1.24.2.


Table 7.1.24.2 Description of the "uri" attribute for the "CFPckgDocument" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|uri                                                                       |
|Data Type     |AnyURI (Primitive-type)                                                   |
|Value Space   |See Appendix A3.3.                                                        |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[1]                                                                       |
|Privacy       |There are NO privacy implications.                                        |
|Description   |An unambiguous reference to the CFDocument using a network-resolvable URI.|


#### 7.1.24.3 "frameworkType" Attribute Description

The description of the "frameworkType" attribute for the "CFPckgDocument" class is given in Table 7.1.24.3.


Table 7.1.24.3 Description of the "frameworkType" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: frameworkType
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in version 1.1. This attribute allows framework creators to indicate what type of framework this is, for example course codes. In CASE 1.1. the only predefined type of framework is 'CourseCodes'. Other standardized framework types will be defined.


#### 7.1.24.4 "caseVersion" Attribute Description

The description of the "caseVersion" attribute for the "CFPckgDocument" class is given in Table 7.1.24.4.


Table 7.1.24.4 Description of the "caseVersion" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: caseVersion
* Descriptor: Data Type
  * Definition: CaseVersionEnum
* Descriptor: Value Space
  * Definition: Enumerated value set of: { 1.1 }
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in version 1.1. Denotes the version of the CFDocument. If present it MUST have a value of '1.1'.


#### 7.1.24.5 "creator" Attribute Description

The description of the "creator" attribute for the "CFPckgDocument" class is given in Table 7.1.24.5.


Table 7.1.24.5 Description of the "creator" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: creator
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The entity with authority that promulgates the competency framework. This is the entity that authorized or created the competency framework. It could be an education agency, higher education institution, professional body. It is the owner of the competency framework.


#### 7.1.24.6 "title" Attribute Description

The description of the "title" attribute for the "CFPckgDocument" class is given in Table 7.1.24.6.


Table 7.1.24.6 Description of the "title" attribute for the "CFPckgDocument" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[1]                               |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFDocument.      |


#### 7.1.24.7 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFPckgDocument" class is given in Table 7.1.24.7.


Table 7.1.24.7 Description of the "lastChangeDateTime" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.24.8 "officialSourceURL" Attribute Description

The description of the "officialSourceURL" attribute for the "CFPckgDocument" class is given in Table 7.1.24.8.


Table 7.1.24.8 Description of the "officialSourceURL" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: officialSourceURL
* Descriptor: Data Type
  * Definition: URL
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The URL link to the formal citation of the original achievement standards document created for humans.


#### 7.1.24.9 "publisher" Attribute Description

The description of the "publisher" attribute for the "CFPckgDocument" class is given in Table 7.1.24.9.


Table 7.1.24.9 Description of the "publisher" attribute for the "CFPckgDocument" class.

|Descriptor    |Definition                                                                  |
|--------------|----------------------------------------------------------------------------|
|Attribute Name|publisher                                                                   |
|Data Type     |NormalizedString (Primitive-type)                                           |
|Value Space   |See Appendix A3.3.                                                          |
|Scope         |Local ("-")                                                                 |
|Multiplicity  |[0..1]                                                                      |
|Privacy       |There are NO privacy implications.                                          |
|Description   |The entity responsible for making the learning standards document available.|


#### 7.1.24.10 "description" Attribute Description

The description of the "description" attribute for the "CFPckgDocument" class is given in Table 7.1.24.10.


Table 7.1.24.10 Description of the "description" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: description
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human readable description of the CFDocument. In Version 1.1 the data-type has been changed from NormalizedString.


#### 7.1.24.11 "subject" Attribute Description

The description of the "subject" attribute for the "CFPckgDocument" class is given in Table 7.1.24.11.


Table 7.1.24.11 Description of the "subject" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: subject
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The topic or academic subject of the Document (this should use some appropriate K-12, HE, etc. based vocabulary).


#### 7.1.24.12 "subjectURI" Attribute Description

The description of the "subjectURI" attribute for the "CFPckgDocument" class is given in Table 7.1.24.12.


Table 7.1.24.12 Description of the "subjectURI" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: subjectURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A set of Link URIs denoting the set of subjects for the document as designated by the promulgating agency. 


#### 7.1.24.13 "language" Attribute Description

The description of the "language" attribute for the "CFPckgDocument" class is given in Table 7.1.24.13.


Table 7.1.24.13 Description of the "language" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: language
* Descriptor: Data Type
  * Definition: Language (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The default language of the text used for the content in the learning standard document (use ISO 639-2 [ISO 639]).


#### 7.1.24.14 "version" Attribute Description

The description of the "version" attribute for the "CFPckgDocument" class is given in Table 7.1.24.14.


Table 7.1.24.14 Description of the "version" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: version
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: Defines the revision of the document (the nature of this versioning is an implementation issue).


#### 7.1.24.15 "adoptionStatus" Attribute Description

The description of the "adoptionStatus" attribute for the "CFPckgDocument" class is given in Table 7.1.24.15.


Table 7.1.24.15 Description of the "adoptionStatus" attribute for the "CFPckgDocument" class.

|Descriptor    |Definition                             |
|--------------|---------------------------------------|
|Attribute Name|adoptionStatus                         |
|Data Type     |NormalizedString (Primitive-type)      |
|Value Space   |See Appendix A3.3.                     |
|Scope         |Local ("-")                            |
|Multiplicity  |[0..1]                                 |
|Privacy       |There are NO privacy implications.     |
|Description   |The publication status of the document.|


#### 7.1.24.16 "statusStartDate" Attribute Description

The description of the "statusStartDate" attribute for the "CFPckgDocument" class is given in Table 7.1.24.16.


Table 7.1.24.16 Description of the "statusStartDate" attribute for the "CFPckgDocument" class.

|Descriptor    |Definition                             |
|--------------|---------------------------------------|
|Attribute Name|statusStartDate                        |
|Data Type     |Date (Primitive-type)                  |
|Value Space   |See Appendix A3.3.                     |
|Scope         |Local ("-")                            |
|Multiplicity  |[0..1]                                 |
|Privacy       |There are NO privacy implications.     |
|Description   |The date the CFDocument status started.|


#### 7.1.24.17 "statusEndDate" Attribute Description

The description of the "statusEndDate" attribute for the "CFPckgDocument" class is given in Table 7.1.24.17.


Table 7.1.24.17 Description of the "statusEndDate" attribute for the "CFPckgDocument" class.

|Descriptor    |Definition                                                        |
|--------------|------------------------------------------------------------------|
|Attribute Name|statusEndDate                                                     |
|Data Type     |Date (Primitive-type)                                             |
|Value Space   |See Appendix A3.3.                                                |
|Scope         |Local ("-")                                                       |
|Multiplicity  |[0..1]                                                            |
|Privacy       |There are NO privacy implications.                                |
|Description   |The date the CFDocument status ended or changed to another status.|


#### 7.1.24.18 "licenseURI" Attribute Description

The description of the "licenseURI" attribute for the "CFPckgDocument" class is given in Table 7.1.24.18.


Table 7.1.24.18 Description of the "licenseURI" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: licenseURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A link to a legal document controlling permission to do something with the standards document.


#### 7.1.24.19 "notes" Attribute Description

The description of the "notes" attribute for the "CFPckgDocument" class is given in Table 7.1.24.19.


Table 7.1.24.19 Description of the "notes" attribute for the "CFPckgDocument" class.

|Descriptor    |Definition                                           |
|--------------|-----------------------------------------------------|
|Attribute Name|notes                                                |
|Data Type     |String (Primitive-type)                              |
|Value Space   |See Appendix A3.3.                                   |
|Scope         |Local ("-")                                          |
|Multiplicity  |[0..1]                                               |
|Privacy       |There are NO privacy implications.                   |
|Description   |Any text used to comment on the published CFDocument.|


#### 7.1.24.20 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFPckgDocument" class is given in Table 7.1.24.20.


Table 7.1.24.20 Description of the "extensions" attribute for the "CFPckgDocument" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFDocumentExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.25 CFPckgItem Class Description

The data model for the "CFPckgItem" class is shown in Figure 7.1.25 and the accompanying definition in Table 7.1.25.

![UML diagram of the CFPckgItem class.](files/figures/FigDataClass_DataModel_CFPckgItem.svg)

Figure 7.1.25 - CFPckgItem class definitions.


Table 7.1.25 Description of the "CFPckgItem" class.


* Descriptor: Class Name
  * Definition: CFPckgItem
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPackage                                            
* Descriptor: Derived Classes
  * Definition: The set of derived classes are:                                                    CFItem                                            
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            fullStatement                            alternativeLabel                            CFItemType                            uri                            humanCodingScheme                            listEnumeration                            abbreviatedStatement                            conceptKeywords                            conceptKeywordsURI                            notes                            subject                            subjectURI                            language                            educationLevel                            CFItemTypeURI                            licenseURI                            statusStartDate                            statusEndDate                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: This is the container for the CFItem data within the context of a CFPackage. This is the content that either describes a specific competency (learning objective) or describes a grouping of competencies within the taxonomy of a Competency Framework Document. 


#### 7.1.25.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFPckgItem" class is given in Table 7.1.25.1.


Table 7.1.25.1 Description of the "identifier" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFItem. This is the primary way in which the exchange identification is achieved.


#### 7.1.25.2 "fullStatement" Attribute Description

The description of the "fullStatement" attribute for the "CFPckgItem" class is given in Table 7.1.25.2.


Table 7.1.25.2 Description of the "fullStatement" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: fullStatement
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The text of the statement. The textual content that either describes a specific competency or describes a less granular group of competencies within the taxonomy of the standards document. In Version 1.1 the data-type was changed from NormalizedString.


#### 7.1.25.3 "alternativeLabel" Attribute Description

The description of the "alternativeLabel" attribute for the "CFPckgItem" class is given in Table 7.1.25.3.


Table 7.1.25.3 Description of the "alternativeLabel" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: alternativeLabel
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An alternate 'term' for Competency.  Some institutions may want to render their achievements as outcomes, or objectives, etc.  Semantically they are the same as Competencies, but diversity of terms is used.  This allows for the flexibility for the institution to define their own term for 'Competency' and not being locked into it.  


#### 7.1.25.4 "CFItemType" Attribute Description

The description of the "CFItemType" attribute for the "CFPckgItem" class is given in Table 7.1.25.4.


Table 7.1.25.4 Description of the "CFItemType" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: CFItemType
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The textual label identifying the class of the statement as designated by the promulgating body.


#### 7.1.25.5 "uri" Attribute Description

The description of the "uri" attribute for the "CFPckgItem" class is given in Table 7.1.25.5.


Table 7.1.25.5 Description of the "uri" attribute for the "CFPckgItem" class.

|Descriptor    |Definition                                                            |
|--------------|----------------------------------------------------------------------|
|Attribute Name|uri                                                                   |
|Data Type     |AnyURI (Primitive-type)                                               |
|Value Space   |See Appendix A3.3.                                                    |
|Scope         |Local ("-")                                                           |
|Multiplicity  |[1]                                                                   |
|Privacy       |There are NO privacy implications.                                    |
|Description   |An unambiguous reference to the CFItem using a network-resolvable URI.|


#### 7.1.25.6 "humanCodingScheme" Attribute Description

The description of the "humanCodingScheme" attribute for the "CFPckgItem" class is given in Table 7.1.25.6.


Table 7.1.25.6 Description of the "humanCodingScheme" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: humanCodingScheme
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human-referenceable code designated by the publisher to identify the item among learning standard items.


#### 7.1.25.7 "listEnumeration" Attribute Description

The description of the "listEnumeration" attribute for the "CFPckgItem" class is given in Table 7.1.25.7.


Table 7.1.25.7 Description of the "listEnumeration" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: listEnumeration
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A set of one or more alphanumeric characters and/or symbol denoting the positioning of the statement being described in a sequential listing of statements. Use of the 'sequenceNumber' in the CFPckgAssociation class is preferred over the use of this property for sequencing.


#### 7.1.25.8 "abbreviatedStatement" Attribute Description

The description of the "abbreviatedStatement" attribute for the "CFPckgItem" class is given in Table 7.1.25.8.


Table 7.1.25.8 Description of the "abbreviatedStatement" attribute for the "CFPckgItem" class.

|Descriptor    |Definition                                   |
|--------------|---------------------------------------------|
|Attribute Name|abbreviatedStatement                         |
|Data Type     |NormalizedString (Primitive-type)            |
|Value Space   |See Appendix A3.3.                           |
|Scope         |Local ("-")                                  |
|Multiplicity  |[0..1]                                       |
|Privacy       |There are NO privacy implications.           |
|Description   |An abbreviated version of the Full Statement.|


#### 7.1.25.9 "conceptKeywords" Attribute Description

The description of the "conceptKeywords" attribute for the "CFPckgItem" class is given in Table 7.1.25.9.


Table 7.1.25.9 Description of the "conceptKeywords" attribute for the "CFPckgItem" class.

|Descriptor    |Definition                                                                    |
|--------------|------------------------------------------------------------------------------|
|Attribute Name|conceptKeywords                                                               |
|Data Type     |NormalizedString (Primitive-type)                                             |
|Value Space   |See Appendix A3.3.                                                            |
|Scope         |Local ("-")                                                                   |
|Multiplicity  |[0.. unbounded]                                                               |
|Privacy       |There are NO privacy implications.                                            |
|Description   |The significant topicality of the CFItem using free-text keywords and phrases.|


#### 7.1.25.10 "conceptKeywordsURI" Attribute Description

The description of the "conceptKeywordsURI" attribute for the "CFPckgItem" class is given in Table 7.1.25.10.


Table 7.1.25.10 Description of the "conceptKeywordsURI" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: conceptKeywordsURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The significant topicality of the CFItem using a controlled vocabulary maintained as linked data. 


#### 7.1.25.11 "notes" Attribute Description

The description of the "notes" attribute for the "CFPckgItem" class is given in Table 7.1.25.11.


Table 7.1.25.11 Description of the "notes" attribute for the "CFPckgItem" class.

|Descriptor    |Definition                                             |
|--------------|-------------------------------------------------------|
|Attribute Name|notes                                                  |
|Data Type     |String (Primitive-type)                                |
|Value Space   |See Appendix A3.3.                                     |
|Scope         |Local ("-")                                            |
|Multiplicity  |[0..1]                                                 |
|Privacy       |There are NO privacy implications.                     |
|Description   |Information about the derivation of a CFItem statement.|


#### 7.1.25.12 "subject" Attribute Description

The description of the "subject" attribute for the "CFPckgItem" class is given in Table 7.1.25.12.


Table 7.1.25.12 Description of the "subject" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: subject
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A new attribute added in Version 1.1. The topic or academic subject of the Item (this should use some appropriate K-12, HE, etc. based vocabulary).


#### 7.1.25.13 "subjectURI" Attribute Description

The description of the "subjectURI" attribute for the "CFPckgItem" class is given in Table 7.1.25.13.


Table 7.1.25.13 Description of the "subjectURI" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: subjectURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A new attribute added in Version 1.1.  A set of Link URIs denoting the set of subjects for the Item as designated by the promulgating agency.


#### 7.1.25.14 "language" Attribute Description

The description of the "language" attribute for the "CFPckgItem" class is given in Table 7.1.25.14.


Table 7.1.25.14 Description of the "language" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: language
* Descriptor: Data Type
  * Definition: Language (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The default language of the text used for the content in the learning standard document (use ISO 639-2 [ISO 639]).


#### 7.1.25.15 "educationLevel" Attribute Description

The description of the "educationLevel" attribute for the "CFPckgItem" class is given in Table 7.1.25.15.


Table 7.1.25.15 Description of the "educationLevel" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: educationLevel
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The education level, grade level or primary instructional level at which a CFItem is intended


#### 7.1.25.16 "CFItemTypeURI" Attribute Description

The description of the "CFItemTypeURI" attribute for the "CFPckgItem" class is given in Table 7.1.25.16.


Table 7.1.25.16 Description of the "CFItemTypeURI" attribute for the "CFPckgItem" class.

|Descriptor    |Definition                                          |
|--------------|----------------------------------------------------|
|Attribute Name|CFItemTypeURI                                       |
|Data Type     |LinkURI                                             |
|Value Space   |Container [  Unordered  ]                           |
|Scope         |Local ("-")                                         |
|Multiplicity  |[0..1]                                              |
|Privacy       |There are NO privacy implications.                  |
|Description   |This is the linked data location for the CFItemType.|


#### 7.1.25.17 "licenseURI" Attribute Description

The description of the "licenseURI" attribute for the "CFPckgItem" class is given in Table 7.1.25.17.


Table 7.1.25.17 Description of the "licenseURI" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: licenseURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A link to a legal document controlling permission to do something with the CFItem.


#### 7.1.25.18 "statusStartDate" Attribute Description

The description of the "statusStartDate" attribute for the "CFPckgItem" class is given in Table 7.1.25.18.


Table 7.1.25.18 Description of the "statusStartDate" attribute for the "CFPckgItem" class.

|Descriptor    |Definition                         |
|--------------|-----------------------------------|
|Attribute Name|statusStartDate                    |
|Data Type     |Date (Primitive-type)              |
|Value Space   |See Appendix A3.3.                 |
|Scope         |Local ("-")                        |
|Multiplicity  |[0..1]                             |
|Privacy       |There are NO privacy implications. |
|Description   |The date the CFItem status started.|


#### 7.1.25.19 "statusEndDate" Attribute Description

The description of the "statusEndDate" attribute for the "CFPckgItem" class is given in Table 7.1.25.19.


Table 7.1.25.19 Description of the "statusEndDate" attribute for the "CFPckgItem" class.

|Descriptor    |Definition                                                    |
|--------------|--------------------------------------------------------------|
|Attribute Name|statusEndDate                                                 |
|Data Type     |Date (Primitive-type)                                         |
|Value Space   |See Appendix A3.3.                                            |
|Scope         |Local ("-")                                                   |
|Multiplicity  |[0..1]                                                        |
|Privacy       |There are NO privacy implications.                            |
|Description   |The date the CFItem status ended or changed to another status.|


#### 7.1.25.20 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFPckgItem" class is given in Table 7.1.25.20.


Table 7.1.25.20 Description of the "lastChangeDateTime" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.25.21 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFPckgItem" class is given in Table 7.1.25.21.


Table 7.1.25.21 Description of the "extensions" attribute for the "CFPckgItem" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFItemExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.26 CFRubric Class Description

The data model for the "CFRubric" class is shown in Figure 7.1.26 and the accompanying definition in Table 7.1.26.

![UML diagram of the CFRubric class.](files/figures/FigDataClass_DataModel_CFRubric.svg)

Figure 7.1.26 - CFRubric class definitions.


Table 7.1.26 Description of the "CFRubric" class.


* Descriptor: Class Name
  * Definition: CFRubric
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPackage                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            description                            lastChangeDateTime                            CFRubricCriteria                            extensions                                            
* Descriptor: Description
  * Definition: The container for the definition of a rubric which is addressed by the competency framework. This includes the set of associated CFRubricCriteria and CFRubricCriterionLevels.


#### 7.1.26.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFRubric" class is given in Table 7.1.26.1.


Table 7.1.26.1 Description of the "identifier" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFRubric. This is the primary way in which the exchange identification is achieved.


#### 7.1.26.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFRubric" class is given in Table 7.1.26.2.


Table 7.1.26.2 Description of the "uri" attribute for the "CFRubric" class.

|Descriptor    |Definition                                                              |
|--------------|------------------------------------------------------------------------|
|Attribute Name|uri                                                                     |
|Data Type     |AnyURI (Primitive-type)                                                 |
|Value Space   |See Appendix A3.3.                                                      |
|Scope         |Local ("-")                                                             |
|Multiplicity  |[1]                                                                     |
|Privacy       |There are NO privacy implications.                                      |
|Description   |An unambiguous reference to the CFRubric using a network-resolvable URI.|


#### 7.1.26.3 "title" Attribute Description

The description of the "title" attribute for the "CFRubric" class is given in Table 7.1.26.3.


Table 7.1.26.3 Description of the "title" attribute for the "CFRubric" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[0..1]                            |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFRubric.        |


#### 7.1.26.4 "description" Attribute Description

The description of the "description" attribute for the "CFRubric" class is given in Table 7.1.26.4.


Table 7.1.26.4 Description of the "description" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: description
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human readable description of the CFRubric. In Version 1.1 the data-type for this attribute has been changed from NormalizedString. 


#### 7.1.26.5 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFRubric" class is given in Table 7.1.26.5.


Table 7.1.26.5 Description of the "lastChangeDateTime" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.26.6 "CFRubricCriteria" Attribute Description

The description of the "CFRubricCriteria" attribute for the "CFRubric" class is given in Table 7.1.26.6.


Table 7.1.26.6 Description of the "CFRubricCriteria" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: CFRubricCriteria
* Descriptor: Data Type
  * Definition: CFRubricCriterion
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFRubricCriterion that are required to complete the definition of the parent CFRubric.


#### 7.1.26.7 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFRubric" class is given in Table 7.1.26.7.


Table 7.1.26.7 Description of the "extensions" attribute for the "CFRubric" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFRubricExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.27 CFRubricCriterion Class Description

The data model for the "CFRubricCriterion" class is shown in Figure 7.1.27 and the accompanying definition in Table 7.1.27.

![UML diagram of the CFRubricCriterion class.](files/figures/FigDataClass_DataModel_CFRubricCriterion.svg)

Figure 7.1.27 - CFRubricCriterion class definitions.


Table 7.1.27 Description of the "CFRubricCriterion" class.


* Descriptor: Class Name
  * Definition: CFRubricCriterion
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFRubric                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            category                            description                            CFItemURI                            weight                            position                            rubricId                            lastChangeDateTime                            CFRubricCriterionLevels                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    CFItemURI                            rubricId                                            
* Descriptor: Description
  * Definition: The container for the definition of a rubric criterion which is addressed by the competency framework.


#### 7.1.27.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.1.


Table 7.1.27.1 Description of the "identifier" attribute for the "CFRubricCriterion" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFRubricCriterion. This is the primary way in which the exchange identification is achieved.


#### 7.1.27.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.2.


Table 7.1.27.2 Description of the "uri" attribute for the "CFRubricCriterion" class.

|Descriptor    |Definition                                                                       |
|--------------|---------------------------------------------------------------------------------|
|Attribute Name|uri                                                                              |
|Data Type     |AnyURI (Primitive-type)                                                          |
|Value Space   |See Appendix A3.3.                                                               |
|Scope         |Local ("-")                                                                      |
|Multiplicity  |[1]                                                                              |
|Privacy       |There are NO privacy implications.                                               |
|Description   |An unambiguous reference to the CFRubricCriterion using a network-resolvable URI.|


#### 7.1.27.3 "category" Attribute Description

The description of the "category" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.3.


Table 7.1.27.3 Description of the "category" attribute for the "CFRubricCriterion" class.

|Descriptor    |Definition                                                             |
|--------------|-----------------------------------------------------------------------|
|Attribute Name|category                                                               |
|Data Type     |NormalizedString (Primitive-type)                                      |
|Value Space   |See Appendix A3.3.                                                     |
|Scope         |Local ("-")                                                            |
|Multiplicity  |[0..1]                                                                 |
|Privacy       |There are NO privacy implications.                                     |
|Description   |A textual label for category by which CFRubricCriterion may be grouped.|


#### 7.1.27.4 "description" Attribute Description

The description of the "description" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.4.


Table 7.1.27.4 Description of the "description" attribute for the "CFRubricCriterion" class.

|Descriptor    |Definition                                            |
|--------------|------------------------------------------------------|
|Attribute Name|description                                           |
|Data Type     |String (Primitive-type)                               |
|Value Space   |See Appendix A3.3.                                    |
|Scope         |Local ("-")                                           |
|Multiplicity  |[0..1]                                                |
|Privacy       |There are NO privacy implications.                    |
|Description   |A human readable description of the CFRubricCriterion.|


#### 7.1.27.5 "CFItemURI" Attribute Description

The description of the "CFItemURI" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.5.


Table 7.1.27.5 Description of the "CFItemURI" attribute for the "CFRubricCriterion" class.


* Descriptor: Attribute Name
  * Definition: CFItemURI
* Descriptor: Data Type
  * Definition: LinkURI
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFItem to which this rubric criterion is associated using a network-resolvable URI and link data.
* Descriptor: Link Data
  * Definition: This is the URI for the associated CFItem.See CFItem for the details about this link.


#### 7.1.27.6 "weight" Attribute Description

The description of the "weight" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.6.


Table 7.1.27.6 Description of the "weight" attribute for the "CFRubricCriterion" class.

|Descriptor    |Definition                                                                   |
|--------------|-----------------------------------------------------------------------------|
|Attribute Name|weight                                                                       |
|Data Type     |Float (Primitive-type)                                                       |
|Value Space   |See Appendix A3.3.                                                           |
|Scope         |Local ("-")                                                                  |
|Multiplicity  |[0..1]                                                                       |
|Privacy       |There are NO privacy implications.                                           |
|Description   |A numeric weight assigned to this CFRubricCriterion, used for scored rubrics.|


#### 7.1.27.7 "position" Attribute Description

The description of the "position" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.7.


Table 7.1.27.7 Description of the "position" attribute for the "CFRubricCriterion" class.


* Descriptor: Attribute Name
  * Definition: position
* Descriptor: Data Type
  * Definition: Integer (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A numeric value representing this criterion's position in the criteria list for this CFRubric.


#### 7.1.27.8 "rubricId" Attribute Description

The description of the "rubricId" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.8.


Table 7.1.27.8 Description of the "rubricId" attribute for the "CFRubricCriterion" class.


* Descriptor: Attribute Name
  * Definition: rubricId
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The UUID for the parent CFRubric. This is included for forwards compatibility to enable access to the CFRubricCriterion without requiring embedding within the CFRubric itself.
* Descriptor: Link Data
  * Definition: This is the UUID for the associated CFRubric.See CFRubric for the details about this link.


#### 7.1.27.9 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.9.


Table 7.1.27.9 Description of the "lastChangeDateTime" attribute for the "CFRubricCriterion" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.27.10 "CFRubricCriterionLevels" Attribute Description

The description of the "CFRubricCriterionLevels" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.10.


Table 7.1.27.10 Description of the "CFRubricCriterionLevels" attribute for the "CFRubricCriterion" class.


* Descriptor: Attribute Name
  * Definition: CFRubricCriterionLevels
* Descriptor: Data Type
  * Definition: CFRubricCriterionLevel
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFRubricCriterionLevels that are required to complete the definition of the parent CFRubricCriterion.


#### 7.1.27.11 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFRubricCriterion" class is given in Table 7.1.27.11.


Table 7.1.27.11 Description of the "extensions" attribute for the "CFRubricCriterion" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFRubricCriterionExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.28 CFRubricCriterionExtension Class Description

The data model for the "CFRubricCriterionExtension" class is shown in Figure 7.1.28 and the accompanying definition in Table 7.1.28.

![UML diagram of the CFRubricCriterionExtension class.](files/figures/FigDataClass_DataModel_CFRubricCriterionExtension.svg)

Figure 7.1.28 - CFRubricCriterionExtension class definitions.


Table 7.1.28 Description of the "CFRubricCriterionExtension" class.


* Descriptor: Class Name
  * Definition: CFRubricCriterionExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFRubricCriterion                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFRubricCriterionExtension class.


#### 7.1.28.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFRubricCriterionExtension" class is given in Table 7.1.28.1.


Table 7.1.28.1 Description of the "extensions" attribute for the "CFRubricCriterionExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.29 CFRubricCriterionLevel Class Description

The data model for the "CFRubricCriterionLevel" class is shown in Figure 7.1.29 and the accompanying definition in Table 7.1.29.

![UML diagram of the CFRubricCriterionLevel class.](files/figures/FigDataClass_DataModel_CFRubricCriterionLevel.svg)

Figure 7.1.29 - CFRubricCriterionLevel class definitions.


Table 7.1.29 Description of the "CFRubricCriterionLevel" class.


* Descriptor: Class Name
  * Definition: CFRubricCriterionLevel
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFRubricCriterion                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            description                            quality                            score                            feedback                            position                            rubricCriterionId                            lastChangeDateTime                            extensions                                            
* Descriptor: Link Data
  * Definition: The set of attributes that are used to provide links to other data objects are:                                                    rubricCriterionId                                            
* Descriptor: Description
  * Definition: The container for the definition of a criterion level which is addressed by the competency framework.


#### 7.1.29.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.1.


Table 7.1.29.1 Description of the "identifier" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFRubricCriterionLevel. This is the primary way in which the exchange identification is achieved.


#### 7.1.29.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.2.


Table 7.1.29.2 Description of the "uri" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: uri
* Descriptor: Data Type
  * Definition: AnyURI (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous reference to the CFRubricCriterionLevel using a network-resolvable URI.


#### 7.1.29.3 "description" Attribute Description

The description of the "description" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.3.


Table 7.1.29.3 Description of the "description" attribute for the "CFRubricCriterionLevel" class.

|Descriptor    |Definition                                                 |
|--------------|-----------------------------------------------------------|
|Attribute Name|description                                                |
|Data Type     |String (Primitive-type)                                    |
|Value Space   |See Appendix A3.3.                                         |
|Scope         |Local ("-")                                                |
|Multiplicity  |[0..1]                                                     |
|Privacy       |There are NO privacy implications.                         |
|Description   |A human readable description of the CFRubricCriterionLevel.|


#### 7.1.29.4 "quality" Attribute Description

The description of the "quality" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.4.


Table 7.1.29.4 Description of the "quality" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: quality
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A qualitative description of this degree of achievement used for column headers or row labels in tabular rubrics.


#### 7.1.29.5 "score" Attribute Description

The description of the "score" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.5.


Table 7.1.29.5 Description of the "score" attribute for the "CFRubricCriterionLevel" class.

|Descriptor    |Definition                                  |
|--------------|--------------------------------------------|
|Attribute Name|score                                       |
|Data Type     |Float (Primitive-type)                      |
|Value Space   |See Appendix A3.3.                          |
|Scope         |Local ("-")                                 |
|Multiplicity  |[0..1]                                      |
|Privacy       |There are NO privacy implications.          |
|Description   |The points awarded for achieving this level.|


#### 7.1.29.6 "feedback" Attribute Description

The description of the "feedback" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.6.


Table 7.1.29.6 Description of the "feedback" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: feedback
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: Pre-defined feedback text to be relayed to the person or organization being evaluated. This may include guidance and suggestions for improvement or development.


#### 7.1.29.7 "position" Attribute Description

The description of the "position" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.7.


Table 7.1.29.7 Description of the "position" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: position
* Descriptor: Data Type
  * Definition: Integer (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A numeric value representing the level's position in the list of levels defined for the CFRubricCriterion.


#### 7.1.29.8 "rubricCriterionId" Attribute Description

The description of the "rubricCriterionId" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.8.


Table 7.1.29.8 Description of the "rubricCriterionId" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: rubricCriterionId
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The UUID for the parent CFRubricCriterion. This is included for forwards compatibility to enable access to the CFRubricCriterionLevel without requiring embedding within the CFRubricCriterion itself.
* Descriptor: Link Data
  * Definition: This is the UUID for the associated CFRubricCriterion.See CFRubricCriterion for the details about this link.


#### 7.1.29.9 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.9.


Table 7.1.29.9 Description of the "lastChangeDateTime" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.29.10 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFRubricCriterionLevel" class is given in Table 7.1.29.10.


Table 7.1.29.10 Description of the "extensions" attribute for the "CFRubricCriterionLevel" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFRubricCriterionLevelExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.30 CFRubricCriterionLevelExtension Class Description

The data model for the "CFRubricCriterionLevelExtension" class is shown in Figure 7.1.30 and the accompanying definition in Table 7.1.30.

![UML diagram of the CFRubricCriterionLevelExtension class.](files/figures/FigDataClass_DataModel_CFRubricCriterionLevelExtension.svg)

Figure 7.1.30 - CFRubricCriterionLevelExtension class definitions.


Table 7.1.30 Description of the "CFRubricCriterionLevelExtension" class.


* Descriptor: Class Name
  * Definition: CFRubricCriterionLevelExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFRubricCriterionLevel                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFRubricCriterionLevel class.


#### 7.1.30.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFRubricCriterionLevelExtension" class is given in Table 7.1.30.1.


Table 7.1.30.1 Description of the "extensions" attribute for the "CFRubricCriterionLevelExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.31 CFRubricExtension Class Description

The data model for the "CFRubricExtension" class is shown in Figure 7.1.31 and the accompanying definition in Table 7.1.31.

![UML diagram of the CFRubricExtension class.](files/figures/FigDataClass_DataModel_CFRubricExtension.svg)

Figure 7.1.31 - CFRubricExtension class definitions.


Table 7.1.31 Description of the "CFRubricExtension" class.


* Descriptor: Class Name
  * Definition: CFRubricExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFRubric                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFRubric class.


#### 7.1.31.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFRubricExtension" class is given in Table 7.1.31.1.


Table 7.1.31.1 Description of the "extensions" attribute for the "CFRubricExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.32 CFSubject Class Description

The data model for the "CFSubject" class is shown in Figure 7.1.32 and the accompanying definition in Table 7.1.32.

![UML diagram of the CFSubject class.](files/figures/FigDataClass_DataModel_CFSubject.svg)

Figure 7.1.32 - CFSubject class definitions.


Table 7.1.32 Description of the "CFSubject" class.


* Descriptor: Class Name
  * Definition: CFSubject
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFDefinition                            CFSubjectSet                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    identifier                            uri                            title                            hierarchyCode                            description                            lastChangeDateTime                            extensions                                            
* Descriptor: Description
  * Definition: The container for the definition of a topic or academic subject which is addressed by the competency framework.


#### 7.1.32.1 "identifier" Attribute Description

The description of the "identifier" attribute for the "CFSubject" class is given in Table 7.1.32.1.


Table 7.1.32.1 Description of the "identifier" attribute for the "CFSubject" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier for the CFSubject. This is the primary way in which the exchange identification is achieved.


#### 7.1.32.2 "uri" Attribute Description

The description of the "uri" attribute for the "CFSubject" class is given in Table 7.1.32.2.


Table 7.1.32.2 Description of the "uri" attribute for the "CFSubject" class.

|Descriptor    |Definition                                                                |
|--------------|--------------------------------------------------------------------------|
|Attribute Name|uri                                                                       |
|Data Type     |AnyURI (Primitive-type)                                                   |
|Value Space   |See Appendix A3.3.                                                        |
|Scope         |Local ("-")                                                               |
|Multiplicity  |[1]                                                                       |
|Privacy       |There are NO privacy implications.                                        |
|Description   |An unambiguous reference to the CFSubject using a network-resolvable URI. |


#### 7.1.32.3 "title" Attribute Description

The description of the "title" attribute for the "CFSubject" class is given in Table 7.1.32.3.


Table 7.1.32.3 Description of the "title" attribute for the "CFSubject" class.

|Descriptor    |Definition                        |
|--------------|----------------------------------|
|Attribute Name|title                             |
|Data Type     |NormalizedString (Primitive-type) |
|Value Space   |See Appendix A3.3.                |
|Scope         |Local ("-")                       |
|Multiplicity  |[1]                               |
|Privacy       |There are NO privacy implications.|
|Description   |The title of the CFSubject.       |


#### 7.1.32.4 "hierarchyCode" Attribute Description

The description of the "hierarchyCode" attribute for the "CFSubject" class is given in Table 7.1.32.4.


Table 7.1.32.4 Description of the "hierarchyCode" attribute for the "CFSubject" class.


* Descriptor: Attribute Name
  * Definition: hierarchyCode
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human-referenceable code designated by the publisher to identify the item in the hierarchy of the subjects.


#### 7.1.32.5 "description" Attribute Description

The description of the "description" attribute for the "CFSubject" class is given in Table 7.1.32.5.


Table 7.1.32.5 Description of the "description" attribute for the "CFSubject" class.

|Descriptor    |Definition                                    |
|--------------|----------------------------------------------|
|Attribute Name|description                                   |
|Data Type     |String (Primitive-type)                       |
|Value Space   |See Appendix A3.3.                            |
|Scope         |Local ("-")                                   |
|Multiplicity  |[0..1]                                        |
|Privacy       |There are NO privacy implications.            |
|Description   |A human readable description of the CFSubject.|


#### 7.1.32.6 "lastChangeDateTime" Attribute Description

The description of the "lastChangeDateTime" attribute for the "CFSubject" class is given in Table 7.1.32.6.


Table 7.1.32.6 Description of the "lastChangeDateTime" attribute for the "CFSubject" class.


* Descriptor: Attribute Name
  * Definition: lastChangeDateTime
* Descriptor: Data Type
  * Definition: DateTime (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A system generated timestamp of the most recent change to this record. This conforms to ISO 8601 dateTime definition [ISO 8601].


#### 7.1.32.7 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFSubject" class is given in Table 7.1.32.7.


Table 7.1.32.7 Description of the "extensions" attribute for the "CFSubject" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: CFSubjectExtension
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. This enables extension of this class. The actual extension mechanism is dependent upon the binding technology being used.


### 7.1.33 CFSubjectExtension Class Description

The data model for the "CFSubjectExtension" class is shown in Figure 7.1.33 and the accompanying definition in Table 7.1.33.

![UML diagram of the CFSubjectExtension class.](files/figures/FigDataClass_DataModel_CFSubjectExtension.svg)

Figure 7.1.33 - CFSubjectExtension class definitions.


Table 7.1.33 Description of the "CFSubjectExtension" class.


* Descriptor: Class Name
  * Definition: CFSubjectExtension
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFSubject                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    extensions [P]                                            
* Descriptor: Description
  * Definition: The container for the proprietary extensions to the CFSubject class.


#### 7.1.33.1 "extensions" Attribute Description

The description of the "extensions" attribute for the "CFSubjectExtension" class is given in Table 7.1.33.1.


Table 7.1.33.1 Description of the "extensions" attribute for the "CFSubjectExtension" class.


* Descriptor: Attribute Name
  * Definition: extensions
* Descriptor: Data Type
  * Definition: Namespace (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [0.. unbounded]
* Descriptor: Privacy
  * Definition: Type: ExtensionThis extension enables the exchange of proprietary data. Therefore this is a privacy vulnerability.
* Descriptor: Description
  * Definition: The form of the extension is dependent on the binding technology being used. This specification is silent on what implementers may consider to be appropriate extensions.


### 7.1.34 CFSubjectSet Class Description

The data model for the "CFSubjectSet" class is shown in Figure 7.1.34 and the accompanying definition in Table 7.1.34.

![UML diagram of the CFSubjectSet class.](files/figures/FigDataClass_DataModel_CFSubjectSet.svg)

Figure 7.1.34 - CFSubjectSet class definitions.


Table 7.1.34 Description of the "CFSubjectSet" class.


* Descriptor: Class Name
  * Definition: CFSubjectSet
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    CFSubjects                                            
* Descriptor: Description
  * Definition: The container for the set of CFSubjects supplied in the response payload. The relationship between the CFSubjects is determined by the 'hierarchyCode'. The first CFSubject is that which has been specified in the call. The other CFSubjects are the set of children as determined by their place in the 'hierarchyCode' of the CFSubject.


#### 7.1.34.1 "CFSubjects" Attribute Description

The description of the "CFSubjects" attribute for the "CFSubjectSet" class is given in Table 7.1.34.1.


Table 7.1.34.1 Description of the "CFSubjects" attribute for the "CFSubjectSet" class.


* Descriptor: Attribute Name
  * Definition: CFSubjects
* Descriptor: Data Type
  * Definition: CFSubject
* Descriptor: Value Space
  * Definition: Container [  Unordered  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1.. unbounded]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of CFSubjects. The relationship between the CFSubjects is determined by the 'hierarchyCode'. The first CFSubject is that which has been specified in the call. The other CFSubjects are the set of children as determined by their place in the 'hierarchyCode' of the CFSubject.


### 7.1.35 LinkGenURI Class Description

The data model for the "LinkGenURI" class is shown in Figure 7.1.35 and the accompanying definition in Table 7.1.35.

![UML diagram of the LinkGenURI class.](files/figures/FigDataClass_DataModel_LinkGenURI.svg)

Figure 7.1.35 - LinkGenURI class definitions.


Table 7.1.35 Description of the "LinkGenURI" class.


* Descriptor: Class Name
  * Definition: LinkGenURI
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPckgAssociation                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    title                            identifier                            uri                            targetType                                            
* Descriptor: Description
  * Definition: A container for the information that is used to achieve the link data reference.


#### 7.1.35.1 "title" Attribute Description

The description of the "title" attribute for the "LinkGenURI" class is given in Table 7.1.35.1.


Table 7.1.35.1 Description of the "title" attribute for the "LinkGenURI" class.

|Descriptor    |Definition                                       |
|--------------|-------------------------------------------------|
|Attribute Name|title                                            |
|Data Type     |NormalizedString (Primitive-type)                |
|Value Space   |See Appendix A3.3.                               |
|Scope         |Local ("-")                                      |
|Multiplicity  |[1]                                              |
|Privacy       |There are NO privacy implications.               |
|Description   |A human readable title for the associated object.|


#### 7.1.35.2 "identifier" Attribute Description

The description of the "identifier" attribute for the "LinkGenURI" class is given in Table 7.1.35.2.


Table 7.1.35.2 Description of the "identifier" attribute for the "LinkGenURI" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier (this may or may not be a UUID) for the associated object.


#### 7.1.35.3 "uri" Attribute Description

The description of the "uri" attribute for the "LinkGenURI" class is given in Table 7.1.35.3.


Table 7.1.35.3 Description of the "uri" attribute for the "LinkGenURI" class.


* Descriptor: Attribute Name
  * Definition: uri
* Descriptor: Data Type
  * Definition: AnyURI (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A network-resolvable URI pointing to the authoritative reference for the associated object.


#### 7.1.35.4 "targetType" Attribute Description

The description of the "targetType" attribute for the "LinkGenURI" class is given in Table 7.1.35.4.


Table 7.1.35.4 Description of the "targetType" attribute for the "LinkGenURI" class.


* Descriptor: Attribute Name
  * Definition: targetType
* Descriptor: Data Type
  * Definition: TargetTypeExtEnum
* Descriptor: Value Space
  * Definition: Container [ Union ]Default = "CASE".
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This is a new attribute added in Version 1.1. It is used to identify the type of the referenced association i.e. this MAY NOT be a CASE Framework.


### 7.1.36 LinkURI Class Description

The data model for the "LinkURI" class is shown in Figure 7.1.36 and the accompanying definition in Table 7.1.36.

![UML diagram of the LinkURI class.](files/figures/FigDataClass_DataModel_LinkURI.svg)

Figure 7.1.36 - LinkURI class definitions.


Table 7.1.36 Description of the "LinkURI" class.


* Descriptor: Class Name
  * Definition: LinkURI
* Descriptor: Class Type
  * Definition: Container [ Unordered ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFAssociation                            CFDocument                            CFItem                            CFPckgAssociation                            CFPckgDocument                            CFPckgItem                            CFRubricCriterion                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    title                            identifier                            uri                                            
* Descriptor: Description
  * Definition: A container for the information that is used to achieve the link data reference.


#### 7.1.36.1 "title" Attribute Description

The description of the "title" attribute for the "LinkURI" class is given in Table 7.1.36.1.


Table 7.1.36.1 Description of the "title" attribute for the "LinkURI" class.

|Descriptor    |Definition                                       |
|--------------|-------------------------------------------------|
|Attribute Name|title                                            |
|Data Type     |NormalizedString (Primitive-type)                |
|Value Space   |See Appendix A3.3.                               |
|Scope         |Local ("-")                                      |
|Multiplicity  |[1]                                              |
|Privacy       |There are NO privacy implications.               |
|Description   |A human readable title for the associated object.|


#### 7.1.36.2 "identifier" Attribute Description

The description of the "identifier" attribute for the "LinkURI" class is given in Table 7.1.36.2.


Table 7.1.36.2 Description of the "identifier" attribute for the "LinkURI" class.


* Descriptor: Attribute Name
  * Definition: identifier
* Descriptor: Data Type
  * Definition: UUID
* Descriptor: Value Space
  * Definition: Container [ DerivedType ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: An unambiguous, synthetic, globally unique identifier (UUID) for the associated object.


#### 7.1.36.3 "uri" Attribute Description

The description of the "uri" attribute for the "LinkURI" class is given in Table 7.1.36.3.


Table 7.1.36.3 Description of the "uri" attribute for the "LinkURI" class.


* Descriptor: Attribute Name
  * Definition: uri
* Descriptor: Data Type
  * Definition: AnyURI (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A network-resolvable URI pointing to the authoritative reference for the associated object.


### 7.1.37 imsx\_CodeMinor Class Description

The data model for the "imsx\_CodeMinor" class is shown in Figure 7.1.37 and the accompanying definition in Table 7.1.37.

![UML diagram of the imsx_CodeMinor class.](files/figures/FigDataClass_DataModel_imsx_CodeMinor.svg)

Figure 7.1.37 - imsx\_CodeMinor class definitions.


Table 7.1.37 Description of the "imsx_CodeMinor" class.


* Descriptor: Class Name
  * Definition: imsx_CodeMinor
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    imsx_StatusInfo                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    imsx_codeMinorField                                            
* Descriptor: Description
  * Definition: This is the container for the set of code minor status codes reported in the responses from the Service Provider.


#### 7.1.37.1 "imsx\_codeMinorField" Attribute Description

The description of the "imsx\_codeMinorField" attribute for the "imsx\_CodeMinor" class is given in Table 7.1.37.1.


Table 7.1.37.1 Description of the "imsx_codeMinorField" attribute for the "imsx_CodeMinor" class.

|Descriptor    |Definition                           |
|--------------|-------------------------------------|
|Attribute Name|imsx_codeMinorField                  |
|Data Type     |imsx_CodeMinorField                  |
|Value Space   |Container [  Sequence  ]             |
|Scope         |Local ("-")                          |
|Multiplicity  |[1.. unbounded]                      |
|Privacy       |There are NO privacy implications.   |
|Description   |Each reported code minor status code.|


### 7.1.38 imsx\_CodeMinorField Class Description

The data model for the "imsx\_CodeMinorField" class is shown in Figure 7.1.38 and the accompanying definition in Table 7.1.38.

![UML diagram of the imsx_CodeMinorField class.](files/figures/FigDataClass_DataModel_imsx_CodeMinorField.svg)

Figure 7.1.38 - imsx\_CodeMinorField class definitions.


Table 7.1.38 Description of the "imsx_CodeMinorField" class.


* Descriptor: Class Name
  * Definition: imsx_CodeMinorField
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    imsx_CodeMinor                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    imsx_codeMinorFieldName                            imsx_codeMinorFieldValue                                            
* Descriptor: Description
  * Definition: This is the container for a single code minor status code.


#### 7.1.38.1 "imsx\_codeMinorFieldName" Attribute Description

The description of the "imsx\_codeMinorFieldName" attribute for the "imsx\_CodeMinorField" class is given in Table 7.1.38.1.


Table 7.1.38.1 Description of the "imsx_codeMinorFieldName" attribute for the "imsx_CodeMinorField" class.


* Descriptor: Attribute Name
  * Definition: imsx_codeMinorFieldName
* Descriptor: Data Type
  * Definition: NormalizedString (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: This should contain the identity of the system that has produced the code minor status code report.


#### 7.1.38.2 "imsx\_codeMinorFieldValue" Attribute Description

The description of the "imsx\_codeMinorFieldValue" attribute for the "imsx\_CodeMinorField" class is given in Table 7.1.38.2.


Table 7.1.38.2 Description of the "imsx_codeMinorFieldValue" attribute for the "imsx_CodeMinorField" class.


* Descriptor: Attribute Name
  * Definition: imsx_codeMinorFieldValue
* Descriptor: Data Type
  * Definition: imsx_CodeMinorValueEnum
* Descriptor: Value Space
  * Definition: Enumerated value set of: { fullsuccess | invalid_sort_field | invalid_selection_field | forbidden | unauthorised_request | internal_server_error | unknownobject | server_busy | invalid_uuid }
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The code minor status code (this is a value from the corresponding enumerated vocabulary).


### 7.1.39 imsx\_StatusInfo Class Description

The data model for the "imsx\_StatusInfo" class is shown in Figure 7.1.39 and the accompanying definition in Table 7.1.39.

![UML diagram of the imsx_StatusInfo class.](files/figures/FigDataClass_DataModel_imsx_StatusInfo.svg)

Figure 7.1.39 - imsx\_StatusInfo class definitions.


Table 7.1.39 Description of the "imsx_StatusInfo" class.


* Descriptor: Class Name
  * Definition: imsx_StatusInfo
* Descriptor: Class Type
  * Definition: Container [ Sequence ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: This class is not derived from another class.
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    imsx_codeMajor                            imsx_severity                            imsx_description                            imsx_codeMinor                                            
* Descriptor: Description
  * Definition: This is the container for the status code and associated information returned within the HTTP messages received from the Service Provider. For the CASE service this object will only be returned to provide information about a failed request i.e. it will NOT be in the payload for a successful request. See Appendix B for further information on the interpretation of the information contained within this class


#### 7.1.39.1 "imsx\_codeMajor" Attribute Description

The description of the "imsx\_codeMajor" attribute for the "imsx\_StatusInfo" class is given in Table 7.1.39.1.


Table 7.1.39.1 Description of the "imsx_codeMajor" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_codeMajor
* Descriptor: Data Type
  * Definition: imsx_CodeMajorEnum
* Descriptor: Value Space
  * Definition: Enumerated value set of: { success | processing | failure | unsupported }
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The code major value (from the corresponding enumerated vocabulary). See Appendix B for further information on the interpretation of this set of codes.


#### 7.1.39.2 "imsx\_severity" Attribute Description

The description of the "imsx\_severity" attribute for the "imsx\_StatusInfo" class is given in Table 7.1.39.2.


Table 7.1.39.2 Description of the "imsx_severity" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_severity
* Descriptor: Data Type
  * Definition: imsx_SeverityEnum
* Descriptor: Value Space
  * Definition: Enumerated value set of: { status | warning | error }
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The severity value (from the corresponding enumerated vocabulary). See Appendix B for further information on the interpretation of this set of codes.


#### 7.1.39.3 "imsx\_description" Attribute Description

The description of the "imsx\_description" attribute for the "imsx\_StatusInfo" class is given in Table 7.1.39.3.


Table 7.1.39.3 Description of the "imsx_description" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_description
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: A human readable description supplied by the entity creating the status code information.


#### 7.1.39.4 "imsx\_codeMinor" Attribute Description

The description of the "imsx\_codeMinor" attribute for the "imsx\_StatusInfo" class is given in Table 7.1.39.4.


Table 7.1.39.4 Description of the "imsx_codeMinor" attribute for the "imsx_StatusInfo" class.


* Descriptor: Attribute Name
  * Definition: imsx_codeMinor
* Descriptor: Data Type
  * Definition: imsx_CodeMinor
* Descriptor: Value Space
  * Definition: Container [  Sequence  ]
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [0..1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The set of reported code minor status codes. See Appendix B for further information on the interpretation of this set of codes.


7.2. Derived Class Descriptions
-------------------------------

This Section is NORMATIVE.

All of the derived data classes used within this Information Model are described in this Section. The syntax and semantics for this representation is described in [Appendix A3.2](#AppA3.2).

### 7.2.1 EnumExtString Class Description

The data model for the "EnumExtString" class is shown in Figure 7.2.1 and the accompanying definition in Table 7.2.1.

![UML diagram of the EnumExtString class.](files/figures/FigDerivedClass_DataModel_EnumExtString.svg)

Figure 7.2.1 - EnumExtString class definitions.


Table 7.2.1 Description of the "EnumExtString" class.


* Descriptor: Class Name
  * Definition: EnumExtString
* Descriptor: Class Type
  * Definition: Container [ DerivedType ]
* Descriptor: Parents
  * Definition: There are no parent classes.
* Descriptor: Derived Classes
  * Definition: The set of derived classes are:                                                    CFAssociationTypeExtEnum                            TargetTypeExtEnum                                            
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    NormalizedString (PrimitiveType)                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    pattern                                            
* Descriptor: Description
  * Definition: The data-type that enables an enumerated vocabulary to be extended.


#### 7.2.1.1 "pattern" Attribute Description

The description of the "pattern" attribute for the "EnumExtString" class is given in Table 7.2.1.


Table 7.2.1 Description of the "pattern" attribute for the "EnumExtString" class.


* Descriptor: Attribute Name
  * Definition: pattern
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.Default = "(ext:)
[a-zA-Z0-9\.\-_]+".
* Descriptor: Scope
  * Definition: Global ("+")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: The regular expression to constrain the structure of the string that MUST be used when creating a new, proprietary, vocabulary term. The term must start with the substring 'ext:'.


### 7.2.2 URL Class Description

The data model for the "URL" class is shown in Figure 7.2.2 and the accompanying definition in Table 7.2.2.

![UML diagram of the URL class.](files/figures/FigDerivedClass_DataModel_URL.svg)

Figure 7.2.2 - URL class definitions.


Table 7.2.2 Description of the "URL" class.


* Descriptor: Class Name
  * Definition: URL
* Descriptor: Class Type
  * Definition: Container [ DerivedType ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPckgDocument                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    AnyURI (PrimitiveType)                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         There are no children.                    
* Descriptor: Description
  * Definition: The data-type for establishing a Uniform Resource Locator (URL) as defined by W3C.


### 7.2.3 UUID Class Description

The data model for the "UUID" class is shown in Figure 7.2.3 and the accompanying definition in Table 7.2.3.

![UML diagram of the UUID class.](files/figures/FigDerivedClass_DataModel_UUID.svg)

Figure 7.2.3 - UUID class definitions.


Table 7.2.3 Description of the "UUID" class.


* Descriptor: Class Name
  * Definition: UUID
* Descriptor: Class Type
  * Definition: Container [ DerivedType ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFAssociationGrouping                            CFConcept                            CFItemType                            CFLicense                            CFPckgAssociation                            CFPckgDocument                            CFPckgItem                            CFRubric                            CFRubricCriterion                            CFRubricCriterionLevel                            CFSubject                            LinkURI                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    NormalizedString (PrimitiveType)                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of children attributes are:                                                    pattern                                            
* Descriptor: Description
  * Definition: The data-type for establishing a Globally Unique Identifier (GUID). The form of the GUID is a Universally Unique Identifier (UUID) of 16 hexadecimal characters (lower case) in the format 8-4-4-4-12. All permitted versions (1-5) and variants (1-2) are supported.


#### 7.2.3.1 "pattern" Attribute Description

The description of the "pattern" attribute for the "UUID" class is given in Table 7.2.3.


Table 7.2.3 Description of the "pattern" attribute for the "UUID" class.


* Descriptor: Attribute Name
  * Definition: pattern
* Descriptor: Data Type
  * Definition: String (Primitive-type)
* Descriptor: Value Space
  * Definition: See Appendix A3.3.Default = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5]{1}[0-9a-f]{3}-[8-9a-b]{1}[0-9a-f]{3}-[0-9a-f]{12}".
* Descriptor: Scope
  * Definition: Local ("-")
* Descriptor: Multiplicity
  * Definition: [1]
* Descriptor: Privacy
  * Definition: There are NO privacy implications.
* Descriptor: Description
  * Definition: Defines the regular expression that imposes the form of  UUID.


7.3. Union Class Descriptions
-----------------------------

The set of union classes used within this Information Model are described in this Section. The syntax and semantics for this representation is described in [Appendix A3.2](#AppA3.2).

### 7.3.1 CFAssociationTypeExtEnum Class Description

The data model for the "CFAssociationTypeExtEnum" class is shown in Figure 7.3.1 and the accompanying definition in Table 7.3.1.

![UML diagram of the CFAssociationTypeExtEnum class.](files/figures/FigUnionClass_DataModel_CFAssociationTypeExtEnum.svg)

Figure 7.3.1 - CFAssociationTypeExtEnum class definitions.


Table 7.3.1 Description of the "CFAssociationTypeExtEnum" class.


* Descriptor: Class Name
  * Definition: CFAssociationTypeExtEnum
* Descriptor: Class Type
  * Definition: Container [ Union ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPckgAssociation                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    CFAssociationTypeEnum                            EnumExtString                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of directly inherited children attributes are:                                                    isChildOf                            isPeerOf                            isPartOf                            exactMatchOf                            precedes                            isRelatedTo                            replacedBy                            exemplar                            hasSkillLevel                            isTranslationOf                            pattern                                            
* Descriptor: Description
  * Definition: The data-type for the 'associationType' attribute for the CFPckgAssociation. This is an extensible enumerated vocabulary. Extending the vocabulary makes use of a naming convention. Changed in CASE 1.1.


### 7.3.2 TargetTypeExtEnum Class Description

The data model for the "TargetTypeExtEnum" class is shown in Figure 7.3.2 and the accompanying definition in Table 7.3.2.

![UML diagram of the TargetTypeExtEnum class.](files/figures/FigUnionClass_DataModel_TargetTypeExtEnum.svg)

Figure 7.3.2 - TargetTypeExtEnum class definitions.


Table 7.3.2 Description of the "TargetTypeExtEnum" class.


* Descriptor: Class Name
  * Definition: TargetTypeExtEnum
* Descriptor: Class Type
  * Definition: Container [ Union ]
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    LinkGenURI                                            
* Descriptor: Derived Classes
  * Definition: There are no derived classes.
* Descriptor: Super Classes
  * Definition: The set of classes from which this class is derived:                                                    TargetTypeEnum                            EnumExtString                                            
* Descriptor: Characteristics
  * Definition:                         There are no characteristics.                    
* Descriptor: Children
  * Definition:                         The set of directly inherited children attributes are:                                                    CASE                            pattern                                            
* Descriptor: Description
  * Definition: The data-type for the 'targetType' attribute for a generic Link URI. This is an extensible enumerated vocabulary. Extending the vocabulary makes use of a naming convention.


7.4. Enumerated Vocabulary Descriptions
---------------------------------------

This Section is NORMATIVE.

All of the enumerated vocabularies used within this Information Model are described in this Section. The syntax and semantics for this representation is described in [Appendix A3.4](#AppA3.4).

### 7.4.1 CFAssociationTypeEnum Vocabulary Description

The enumerated set of values for the type of association between CFItems or between CFDocuments. Changed in CASE 1.1. The data model for the "CFAssociationTypeEnum" enumerated class is shown in Figure 7.4.1 and the accompanying vocabulary definition in Table 7.4.1.

![UML diagram of the CFAssociationTypeEnum class.](files/figures/FigEnumeratedClass_DataModel_CFAssociationTypeEnum.svg)

Figure 7.4.1 - CFAssociationTypeEnum class definitions.


Table 7.4.1 Description of the "CFAssociationTypeEnum" enumerated vocabulary terms.


* Descriptor: Class Name
  * Definition: CFAssociationTypeEnum
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFAssociationTypeExtEnum                                            
* Descriptor: Description
  * Definition: The enumerated set of values for the type of association between CFItems or between CFDocuments. Changed in CASE 1.1.
* Descriptor: Tokens
  * Definition:                                                     "exactMatchOf" - equivalent to. Used to connect derived CFItem to CFItem in original source CFDocument.                             "exemplar" - the target/destination node is an example of best practice for the definition of the source/origin.                            "hasSkillLevel" - the destination of this association is understood to define a given skill level i.e. Reading Lexile 100, Depth Knowledge 2, or Cognitive Level (Blooms Taxonomy) etc.                             "isChildOf" - to represent the structural relationship in a taxonomy between parent and child. The source/origin is a child of the target/destination.                            "isPartOf" - the origin of the association is included either physically or logically in the item at the destination of the association. This classifies an item as being logically or semantically contained as a subset of the destination.                            "isPeerOf" - the source/origin is a peer of the target/destination.                            "isRelatedTo" - the origin of the association is related to the destination in some way that is not better described by another association type.                            "isTranslationOf" - a new token added in version 1.1. The target/destination node is a translation of the source node.                            "precedes" - the origin of the association comes before the destination of the association in time or order.                            "replacedBy" - the origin of the association has been supplanted by, displaced by, or superseded by the destination of the association.                                            


### 7.4.2 CaseVersionEnum Vocabulary Description

The set of values permitted to denote which version of the CASE specification is used to validate the content. The data model for the "CaseVersionEnum" enumerated class is shown in Figure 7.4.2 and the accompanying vocabulary definition in Table 7.4.2.

![UML diagram of the CaseVersionEnum class.](files/figures/FigEnumeratedClass_DataModel_CaseVersionEnum.svg)

Figure 7.4.2 - CaseVersionEnum class definitions.


Table 7.4.2 Description of the "CaseVersionEnum" enumerated vocabulary terms.


* Descriptor: Class Name
  * Definition: CaseVersionEnum
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    CFPckgDocument                                            
* Descriptor: Description
  * Definition: The set of values permitted to denote which version of the CASE specification is used to validate the content. 
* Descriptor: Tokens
  * Definition:                                                     "1.1" - denotes that the CFDocument is a CASE 1.1 definition.                                            


### 7.4.3 TargetTypeEnum Vocabulary Description

The set of permitted values for the type of target. The data model for the "TargetTypeEnum" enumerated class is shown in Figure 7.4.3 and the accompanying vocabulary definition in Table 7.4.3.

![UML diagram of the TargetTypeEnum class.](files/figures/FigEnumeratedClass_DataModel_TargetTypeEnum.svg)

Figure 7.4.3 - TargetTypeEnum class definitions.


Table 7.4.3 Description of the "TargetTypeEnum" enumerated vocabulary terms.


* Descriptor: Class Name
  * Definition: TargetTypeEnum
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    TargetTypeExtEnum                                            
* Descriptor: Description
  * Definition: The set of permitted values for the type of target.
* Descriptor: Tokens
  * Definition:                                                     "CASE" - denotes that the association link node points to a CASE-based framework.                                            


### 7.4.4 imsx\_CodeMajorEnum Vocabulary Description

This is the set of primary status report values i.e. the major code assigned to the status block. This is used in conjunction with the 'Severity' structure in the status object. See [Appendix B](#AppB) for further information on the interpretation of this set of codes. The data model for the "imsx\_CodeMajorEnum" enumerated class is shown in Figure 7.4.4 and the accompanying vocabulary definition in Table 7.4.4.

![UML diagram of the imsx_CodeMajorEnum class.](files/figures/FigEnumeratedClass_DataModel_imsx_CodeMajorEnum.svg)

Figure 7.4.4 - imsx\_CodeMajorEnum class definitions.


Table 7.4.4 Description of the "imsx_CodeMajorEnum" enumerated vocabulary terms.


* Descriptor: Class Name
  * Definition: imsx_CodeMajorEnum
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    imsx_StatusInfo                                            
* Descriptor: Description
  * Definition: This is the set of primary status report values i.e. the major code assigned to the status block. This is used in conjunction with the 'Severity' structure in the status object. See Appendix B for further information on the interpretation of this set of codes.
* Descriptor: Tokens
  * Definition:                                                     "failure" - denotes that the transaction request has failed. The detailed reason will be reported in the accompanying 'codeMinor' fields.                            "processing" - denotes that the request is being processed at the destination or there has been a local transmission failure. This value is used in asynchronous services.                            "success" - denotes that the request has been successfully completed. If the associated 'severity' value is 'warning' then the request has been partially successful i.e. best effort by the service provider. Other parts of the status information may provide more insight into a partial success response.                            "unsupported" - denotes that the service provider does not support the requested operation. This is the required default response for an unsupported operation by an implementation.                                            


### 7.4.5 imsx\_CodeMinorValueEnum Vocabulary Description

This is the set of codeMinor status codes that are used to provide further insight into the completion status of the end-to-end transaction i.e. this should be used to provide more information than would be supplied be a HTTP code. See [Appendix B](#AppB) for further information on the interpretation of this set of codes. The data model for the "imsx\_CodeMinorValueEnum" enumerated class is shown in Figure 7.4.5 and the accompanying vocabulary definition in Table 7.4.5.

![UML diagram of the imsx_CodeMinorValueEnum class.](files/figures/FigEnumeratedClass_DataModel_imsx_CodeMinorValueEnum.svg)

Figure 7.4.5 - imsx\_CodeMinorValueEnum class definitions.


Table 7.4.5 Description of the "imsx_CodeMinorValueEnum" enumerated vocabulary terms.


* Descriptor: Class Name
  * Definition: imsx_CodeMinorValueEnum
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    imsx_CodeMinorField                                            
* Descriptor: Description
  * Definition: This is the set of codeMinor status codes that are used to provide further insight into the completion status of the end-to-end transaction i.e. this should be used to provide more information than would be supplied be a HTTP code. See Appendix B for further information on the interpretation of this set of codes.
* Descriptor: Tokens
  * Definition:                                                     "forbidden" - this is used to indicate that the server can be reached and process the request but refuses to take any further action. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '403'.                            "fullsuccess" - the request has been fully and successfully implemented by the Service Provider. For a REST binding this will have an HTTP code of '200' for a successful 'GET' request; '201' for a successful 'PUT' request; '204' for a successful 'DELETE' request.                            "internal_server_error" - this should be used only if there is catastrophic error and there is not a more appropriate code. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '500'.                            "invalid_selection_field" - an invalid selection field was supplied and data filtering on the selection criteria was not possible. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '400'.                            "invalid_sort_field" - an invalid sort field was supplied and so the sorting was not possible. This would be accompanied by the 'codeMajor/severity' values of 'success/warning' and for a REST binding a HTTP code of '200'.                            "invalid_uuid" - the server has received an invalid UUID. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '404'.                            "server_busy" - the server is receiving too many requests. Retry at a later time. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '429'.                            "unauthorised_request" - the request was not correctly authorised. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '401'.                            "unknownobject" - the supplied identifier is unknown in the Service Provider and so the object could not be changed. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '404'.                                            


### 7.4.6 imsx\_SeverityEnum Vocabulary Description

This is the context for the status report values. This is used in conjunction with the 'CodeMajor' structure in the status object. See [Appendix B](#AppB) for further information on the interpretation of this set of codes. The data model for the "imsx\_SeverityEnum" enumerated class is shown in Figure 7.4.6 and the accompanying vocabulary definition in Table 7.4.6.

![UML diagram of the imsx_SeverityEnum class.](files/figures/FigEnumeratedClass_DataModel_imsx_SeverityEnum.svg)

Figure 7.4.6 - imsx\_SeverityEnum class definitions.


Table 7.4.6 Description of the "imsx_SeverityEnum" enumerated vocabulary terms.


* Descriptor: Class Name
  * Definition: imsx_SeverityEnum
* Descriptor: Parents
  * Definition: The set of parent classes are:                                                    imsx_StatusInfo                                            
* Descriptor: Description
  * Definition: This is the context for the status report values. This is used in conjunction with the 'CodeMajor' structure in the status object. See Appendix B for further information on the interpretation of this set of codes.
* Descriptor: Tokens
  * Definition:                                                     "error" - a catastrophic error has occurred in processing the request and so the request was not completed (the Service Provider may not even have received the request).                            "status" - the request has been completed and a response was received from the Service Provider.                            "warning" - the request has only been partially completed. For an asynchronous service a further response should be expected.                                            


[toc](#toc) | [top](#top)

* * *

8\. Data Privacy Implications
-----------------------------

This Section is NORMATIVE.

All of the privacy implications contained within this Information Model are described in this Section. The syntax and semantics for this representation is described in [Appendix A3.8](#AppA3.8). All of the corresponding concepts and methods for these privacy annotations are defined in the 1EdTech Privacy Framework [\[PRIVACY-10\]](#Ref_PRIVACY-10).

There are no privacy implications when using this specification.

[toc](#toc) | [top](#top)

* * *

9\. Link Data Definitions
-------------------------

This Section is NORMATIVE.

All of the link data for the relationships used within this Information Model are described in this Section. The syntax and semantics for this representation is described in [Appendix A3.7](#AppA3.7).

9.1 CFDocument Link Data Description
------------------------------------

The description for the "CFDocument" link data class is shown in Figure 9.1 and defined in Table 9.1.

![UML diagram of the CFDocument link data definition.](files/figures/FigLinkDataClass_CFDocument.svg)

Figure 9.1 - CFDocument link data definition.


Table 9.1 Description of the "CFDocument" link data class.


* Descriptor: Target Class Name
  * Definition: CFDocument
* Descriptor: Link Type
  * Definition: SourcedId - the link is to another first class object that has been assigned an interoperability identifier (the sourcedId).
* Descriptor: Link Sources
  * Definition: The set of source classes that point to an object using this form of link are:                                                    CFAssociation.CFDocumentURI                            CFItem.CFDocumentURI                                            
* Descriptor: Source Attribute/Characteristic Name
  * Definition: LinkURI.identifier
* Descriptor: Target Attribute/Characteristic Name
  * Definition: CFDocument.identifier
* Descriptor: Parent Class Name
  * Definition: Not Applicable
* Descriptor: Description
  * Definition: This is a link, in the form of URI/sourcedId, to the associated parent CFDocument.


9.2 CFItem Link Data Description
--------------------------------

The description for the "CFItem" link data class is shown in Figure 9.2 and defined in Table 9.2.

![UML diagram of the CFItem link data definition.](files/figures/FigLinkDataClass_CFItem.svg)

Figure 9.2 - CFItem link data definition.


Table 9.2 Description of the "CFItem" link data class.


* Descriptor: Target Class Name
  * Definition: CFItem
* Descriptor: Link Type
  * Definition: SourcedId - the link is to another first class object that has been assigned an interoperability identifier (the sourcedId).
* Descriptor: Link Sources
  * Definition: The set of source classes that point to an object using this form of link are:                                                    CFRubricCriterion.CFItemURI                                            
* Descriptor: Source Attribute/Characteristic Name
  * Definition: LinkURI.identifier
* Descriptor: Target Attribute/Characteristic Name
  * Definition: CFItem.identifier
* Descriptor: Parent Class Name
  * Definition: Not Applicable
* Descriptor: Description
  * Definition: This is a link, in the form of URI/sourcedId, to the associated parent CFItem.


9.3 CFPackage Link Data Description
-----------------------------------

The description for the "CFPackage" link data class is shown in Figure 9.3 and defined in Table 9.3.

![UML diagram of the CFPackage link data definition.](files/figures/FigLinkDataClass_CFPackage.svg)

Figure 9.3 - CFPackage link data definition.


Table 9.3 Description of the "CFPackage" link data class.


* Descriptor: Target Class Name
  * Definition: CFPackage
* Descriptor: Link Type
  * Definition: SourcedId - the link is to another first class object that has been assigned an interoperability identifier (the sourcedId).
* Descriptor: Link Sources
  * Definition: The set of source classes that point to an object using this form of link are:                                                    CFDocument.CFPackageURI                                            
* Descriptor: Source Attribute/Characteristic Name
  * Definition: LinkURI.identifier
* Descriptor: Target Attribute/Characteristic Name
  * Definition: CFPackage.identifier
* Descriptor: Parent Class Name
  * Definition: Not Applicable
* Descriptor: Description
  * Definition: This is a link, in the form of URI/sourcedId, to the associated parent CFPackage.


9.4 CFRubric Link Data Description
----------------------------------

The description for the "CFRubric" link data class is shown in Figure 9.4 and defined in Table 9.4.

![UML diagram of the CFRubric link data definition.](files/figures/FigLinkDataClass_CFRubric.svg)

Figure 9.4 - CFRubric link data definition.


Table 9.4 Description of the "CFRubric" link data class.


* Descriptor: Target Class Name
  * Definition: CFRubric
* Descriptor: Link Type
  * Definition: SourcedId - the link is to another first class object that has been assigned an interoperability identifier (the sourcedId).
* Descriptor: Link Sources
  * Definition: The set of source classes that point to an object using this form of link are:                                                    CFRubricCriterion.rubricId                                            
* Descriptor: Source Attribute/Characteristic Name
  * Definition: UUID.UUID
* Descriptor: Target Attribute/Characteristic Name
  * Definition: CFRubric.identifier
* Descriptor: Parent Class Name
  * Definition: Not Applicable
* Descriptor: Description
  * Definition: This is a link, in the form of sourcedId/UUID, to the associated parent CFIRubric.


9.5 CFRubricCriterion Link Data Description
-------------------------------------------

The description for the "CFRubricCriterion" link data class is shown in Figure 9.5 and defined in Table 9.5.

![UML diagram of the CFRubricCriterion link data definition.](files/figures/FigLinkDataClass_CFRubricCriterion.svg)

Figure 9.5 - CFRubricCriterion link data definition.


Table 9.5 Description of the "CFRubricCriterion" link data class.


* Descriptor: Target Class Name
  * Definition: CFRubricCriterion
* Descriptor: Link Type
  * Definition: SourcedId - the link is to another first class object that has been assigned an interoperability identifier (the sourcedId).
* Descriptor: Link Sources
  * Definition: The set of source classes that point to an object using this form of link are:                                                    CFRubricCriterionLevel.rubricCriterionId                                            
* Descriptor: Source Attribute/Characteristic Name
  * Definition: UUID.UUID
* Descriptor: Target Attribute/Characteristic Name
  * Definition: CFRubricCriterion.identifier
* Descriptor: Parent Class Name
  * Definition: Not Applicable
* Descriptor: Description
  * Definition: This is a link, in the form of sourcedId/UUID, to the associated parent CFIRubricCriterion.


[toc](#toc) | [top](#top)

* * *

10\. Extending and Profiling the Service
----------------------------------------

This Section is NOT NORMATIVE.

10.1. Extending the Service
---------------------------

Proprietary extensions of the service are based upon two approaches:

*   The extension of the data models being manipulated by the current set of operations;
*   The inclusion of new operations to support new proprietary functionality.

It is NOT permitted to change the behavior of the current set of operations. Such changes MUST be supported by the creation of new operations.

### 10.1.1. Proprietary Operations

The definition of new operations should follow the same format as adopted herein. The new operations should be defined using a new interface type. Every operation must result in the return of a status code that describes the final state of the request on the target end system.

An example of creating such an extension is given in the accompanying Best Practices document [\[CASE-IMPL-11\]](#Ref_CASE-IMPL-11).

### 10.1.2. Proprietary Data Elements

It is recognized that implementers may wish to extend the specification. The preferred mechanism for doing this is for implementers to use an extension space within the OneRoster data model, and then set their parsers to read those extension attributes. Extensions are ONLY permitted using the 'extensions' attribute within each of the first class objects. The form of the extension is dependent on the binding technology. The extension points are within the following classes:

*   CFAssociationGrouping
*   CFConcept
*   CFDefinition
*   CFItemType
*   CFLicense
*   CFPackage
*   CFPckgAssociation
*   CFPckgDocument
*   CFPckgItem
*   CFRubric
*   CFRubricCriterion
*   CFRubricLevel
*   CFSubject

10.2. Profiling the Service
---------------------------

This Service can be profiled. In general, Profiling is used to:

*   Refine which Interfaces are used and which operations are supported for each Interface;
*   Refine the data models by increasing the constraints on the base definitions.

Valid Profiles must be restrictive i.e. optional features can be removed or constraints increased but new features must not be added. A Profile of this service is made by annotating the UML supplied with the documentation for the specification.

It is strongly recommended that a profile of this specification is undertaken either by, or with the close support, of 1EdTech. However, no matter who is responsible for creating the profile artifacts (documents, OpenAPI files, XSDs, etc.), it is strongly recommended that the 1EdTech specification tools are used. This will ensure that the artifacts are consistent with the base specifications and that useful support documentation is automatically produced e.g. creation of a document that summarises the differences between the base specification and the profile. Organizations wishing to produce a profile of this specification should contact the 1EdTech VP of Operations at: [operations@1edtech.org](mailto:operations@1edtech.org).

[toc](#toc) | [top](#top)

* * *

References
----------



* [BCP 47]: [CASE-BIND-11]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: 1EdTech Competencies and Academic Standards Exchange (CASE) 1.1 REST/JSON Binding Final Release 1.0 Document, P.Williams, S.Haught and C.Smythe, 1EdTech Consortium Inc., September 2024, http://www.imsglobal.org/case/casev1p1/caseservicev1p1_restbindv1p0.html.
* [BCP 47]: [CASE-CERT-11]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: 1EdTech Competencies and Academic Standards Exchange (CASE) 1.1 Conformance and Certification Final Release 1.0 Document, P.Williams, S.Haught and C.Smythe, 1EdTech Consortium Inc., September 2024, http://www.imsglobal.org/case/casev1p1/caseservicev1p1_conformancev1p0.html.
* [BCP 47]: [CASE-IMPL-11]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: 1EdTech Competencies and Academic Standards Exchange (CASE) 1.1 Best Practices and Implementation Guide Final Release 1.0 Document, P.Williams, S.Haught and C.Smythe, 1EdTech Consortium Inc., September 2024, http://www.imsglobal.org/case/casev1p1/caseservicev1p1_bpigv1p0.html.
* [BCP 47]: [I-BAT, 06]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: 1EdTech Binding Auto-generation Toolkit (I-BAT), C.Smythe, 1EdTech Consortium Inc., July 2006.
* [BCP 47]: [ISO 8601]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: ISO8601:2004 Data elements and interchange formats - Information interchange - Representation of dates and times, ISO, International Standards Organization (ISO), 2000.
* [BCP 47]: [Privacy, 24]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: 1EdTech Privacy Framework 1.0 Candidate Final 1.0, C.Smythe and J.McGhee, 1EdTech Consortium Inc., September 2024, https://www.imsglobal.org/spec/privacy/v1p1/.
* [BCP 47]: [RFC 2119]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: Key words for use in RFCs to Indicate Requirement Levels, S.Bradner, IETF (RFC 2119), March 1997, https://tools.ietf.org/html/rfc2119.txt.
* [BCP 47]: [RFC 3066]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: Tags for the Identification of Languages, H.Alvestrand, IETF (RFC 3066), January 2001, https://tools.ietf.org/html/rfc3006.txt.
* [BCP 47]: [Security, 21]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: 1EdTech Security Framework 1.1 Final Release 1.0, C.Smythe, N.Mills, C.Vervoort and M.Mckell, 1EdTech Consortium Inc., July 2021, https://www.imsglobal.org/spec/security/v1p1/.
* [BCP 47]: [VDEX, 04]
  * Matching of Language Tags (RFC 4647) and Tags for Identifying Languages (RFC 5646), A.Phillips and M.Davis, Internet Engineering Task Force, September 2009, https://www.rfc-editor.org/info/bcp47.: 1EdTech Vocabulary Definition Exchange (VDEX) 1.0, A.Cooper, 1EdTech Consortium Inc., February 2004, https://www.imsglobal.org/vdex/vdexv1p0/imsvdex_infov1p0.html.


[toc](#toc) | [top](#top)

* * *

Appendix A Modelling Concepts and Terms
---------------------------------------

A1 Behavior Descriptions Explanations
-------------------------------------

This section is NOT NORMATIVE.

### A1.1 Service Model Diagrams

Table A1.1 provides the key to the descriptions of service model diagrams.


Table A1.1 The key to the descriptions of service model diagrams.


* Feature: Service Model Package
  * Definition and Usage: Each synchronous or asynchronous service model description is enclosed in a UML Package that has the stereotype of « serviceModel » under which is the name of the service being described. A service must have at least one Interface (the breakdown of the service into the component transactions is a design decision).
* Feature: Interface Class
  * Definition and Usage: Each interface description is enclosed in a UML Package that has the stereotype of « Interface » under which is the name of the interface being described. An interface is a collection of operations that support a common set of transaction objectives. An interface must have at least one operation. An Interface class has no attributes.
* Feature: Operation Description
  * Definition and Usage: The behaviors provided by an interface are defined by the set of operations. Each operation must have a unique name and is accompanied by the set of parameters that are sent to the service (in) and those returned by the service (out). An operation can also have a formal return parameter whose form and usage depends upon the actual binding realisation. The description may also include a stereotype for the identification of the nature operation e.g. read, create, etc.


### A1.2 Operation Descriptions

Table A1.2 provides the key to the descriptions of the operation tables.


Table A1.2 The key to the operation description tables.


* Descriptor: Name
  * Definition: The name given to the operation being described. In the case of an interface, by definition, every operation has the scope value of global denoted by the "+" symbol before the name.
* Descriptor: Stereotype
  * Definition: Before the name of the operation there may be a stereotype classifier. This is used to provide information about the nature of the behavior of the operation. The permitted set of stereotype values and their meaning are:                                                    « create » - indicates that a request is being made to create a new object/resource where the requester provides the associated unique identifier;                            « createbp » - indicates that a request is being made to create a new object/resource where the responder provides the associated unique identifier;                            « read » - indicates that a request is being made to read an existing object/resource;                            « update » - indicates that a request is being made to update an existing object/resource i.e. an additive write;                            « delete » -  indicates that a request is being made to delete an existing object/resource;                            « replace » -  indicates that a request is being made to replace an existing object/resource i.e. a destructive write;                            « query » -  indicates that a request is being made to search for objects/resources according to a defined set of search criteria;                            « publish » -  indicates that a request is being made by a publisher in a publish and subscribe binding;                            « subscribe » -  indicates that a request is being made by a subscriber in a publish and subscribe binding.                                            
* Descriptor: Return Function Parameter
  * Definition: The formal return parameter for the operation/method returned for the transaction request (the form in which this information is provided depends on the realisation of the binding). The description includes the name of the parameter and the data-type in the form "name:data-type" pair. The name/data-type provides a link to the associated interface data-type description in The Interface Model. In situations where there is no return function this entry will be set to "void"
* Descriptor: Supplied (in) Parameters
  * Definition: The list of parameters that are sent from the client to the end-service in the service request message. Each parameter description includes the name of the parameter and the data-type in the form "name:data-type" pair. The name/data-type provides a link to the associated interface data-type description in The Interface Model.
* Descriptor: Supplied (out) Parameters
  * Definition: The list of parameters that are returned from the end-service in the service response message. Each parameter description includes the name of the parameter and the data-type in the form "name:data-type" pair. The name/data-type provides a link to the associated interface data-type description in The Interface Model.
* Descriptor: Behavior
  * Definition: A description of the behavior of the operation.
* Descriptor: Notes
  * Definition: Further information on the behavior particularly in the context of the use of other operations and the relationship to the behaviors of those operations.


A2 Interface Descriptions Explanations
--------------------------------------

This section is NOT NORMATIVE.

### A2.1 Parameter Model Diagrams

Table A2.1 provides the key to the descriptions of parameter data model diagrams.


Table A2.1 The key to the descriptions of parameter model diagrams.


* Feature: Data Model Package
  * Definition and Usage: Each parameter data model description is enclosed in a UML Package that has the stereotype of « dataModel » under which is the name of the class being described.
* Feature: DerivedType Class
  * Definition and Usage: This is a class that is identified by the stereotype « DerivedType » under which is the name of the data-type. A derived class is one that is derived either from another derived class or a PrimitiveType class.
* Feature: Enumeration Class
  * Definition and Usage: This is a class that is identified by the stereotype « Enumeration » under which is the name of the enumeration data-type. The enumeration class consists of the list of tokens that are the permitted values of the assigned attribute.
* Feature: Selection Class
  * Definition and Usage: This is a class that is identified by the stereotype « Selection » under which is the name of the data-type. The selection means that only one of the listed attributes make occur in an instance. If this is an abstract class then multiple iterations of the instance may occur and the multiplicity of the attribute defines the constraints on the number of times the attribute can occur in the full instance.
* Feature: Sequence Class
  * Definition and Usage: This is a class that is identified by the stereotype « Sequence » under which is the name of the data-type. The sequence means that the listed attributes must occur only in the order of the attributes listed on the class. The associated multiplicity defines the number of times the attribute may occur consecutively in the instance.
* Feature: Unordered Class
  * Definition and Usage: This is a class that is identified by the stereotype « Unordered » under which is the name of the data-type. The unordering means that the listed attributes may occur in any order but the associated multiplicity for the attribute must be followed (when binding to XML this requires the use of Schematron rules to enforce the multiplicity).
* Feature: Attribute Description
  * Definition and Usage: Each class contains a set of attributes. Each attribute description consists of the scope, name, data-type and multiplicity (see Appendix A2.3 for a more complete description).
* Feature: Composition Arrow
  * Definition and Usage: This is an arrow with a filled diamond head to indicate that the child class is a composite structure of the parent class i.e. the child class only exists within the context of the parent class. This association allows complex structures to be constructed with common subcomponents.


### A2.2 Class Descriptions

Table A2.2 provides the key to the descriptions of the parameter data class tables.


Table A2.2 The key to the descriptions of the data class tables.


* Descriptor: Class Name
  * Definition: The name given to the class being described.
* Descriptor: Class Type
  * Definition: The nature of the class (for a parameter data-type this must not be an abstract class). This is described as a "Container [...]" with the value of "..." being (see Appendix A2.1 for the meaning of these values):                                                    "DerivedType"                            "Sequence"                            "Selection"                            "Unordered"                                            
* Descriptor: Parents
  * Definition: This is the list of operations for which this class is a data-type for one or more of the parameters. Each entry is                             linked to the corresponding operation description.
* Descriptor: Children
  * Definition: Lists the set of attributes for this class (the only other permitted associations are generalizations). The list                          of children includes those that are grouped under a corresponding stereotyped attribute class. Each child is                          linked to the corresponding attribute description table.  The nature of the relationship between the children is                          defined by the stereotype of the parent class i.e. the class type. The marking of [P] is used to denote that the                          attribute has privacy implications that will be described in the corresponding description of the attribute.
* Descriptor: Description
  * Definition: Contains descriptions relating to the class and its properties and relationships.


### A2.3 Attribute Descriptions

Table A2.3 provides the key to the descriptions of the data attributes for the data classes for the operation parameters.


Table A2.3 The key to the descriptions of the data attribute tables.


* Descriptor: Attribute Name
  * Definition: The name given to the attribute being described.
* Descriptor: Data Type
  * Definition: This is the data-type of the attribute.  It can take many forms:                                                    Class Name - the name of the Class (this is linked to the class definition);                            Primitive Data-types - this is the same list as defined under the "Attribute and Characteristic" description (see later in this Appendix for these definitions).                                            
* Descriptor: Value Space
  * Definition: The range of valid values for this class (including any default value). If the value space is unspecified, it is not known or is not important.  This value space must be defined in terms of the associated data-type.
* Descriptor: Scope
  * Definition: This is the scope of the attribute with permitted values of:                                                    Local - denoted by "-" and meaning the attribute has significance and access within the context of the parent class only;                            Global - denoted by "+" and meaning that the attribute has global scoping (so must have a unique name) and can be accessed from anywhere.                                            
* Descriptor: Multiplicity
  * Definition: A property of an attribute indicating the number of times it may be used or appear in a given class instance. The values of this property are expressed as a range or shorthand for a range using the notation:                                                    "0..1" [optional; restricted]                            "0..unbounded" [optional; unrestricted]                            "1..1" [mandatory; restricted]                            "1..unbounded" [mandatory; unrestricted]                                            
* Descriptor: Privacy
  * Definition: Identifies the nature, if any, of the privacy sensitivity. If there are no privacy implications the phrase                          "There are NO privacy implications is presented". When there are privacy implications the category of                          the privacy is present (the available terms are defined in Privacy Data Description Appendix Subsection) along                          with a description of the privacy implications.
* Descriptor: Description
  * Definition: Contains descriptions relating to the attribute and its values space.


A3 Data Model Descriptions Explanations
---------------------------------------

This section is NOT NORMATIVE.

### A3.1 Data Model Diagrams

Table A3.1 provides the key to the descriptions of data model diagrams.


Table A3.1 The key to the descriptions of data model diagrams.


* Feature: Data Model Package
  * Definition and Usage: Each data model description is enclosed in a UML Package that has the stereotype of « dataModel » under which is the name of the data model diagram being described. Only one logical data model can be described.
* Feature: DerivedType Class
  * Definition and Usage: This is a class that is identified by the stereotype « DerivedType » under which is the name of the data-type. A derived class is one that is derived either from another derived class or a PrimitiveType class.
* Feature: Enumeration Class
  * Definition and Usage: This is a class that is identified by the stereotype « Enumeration » under which is the name of the enumeration data-type. The enumeration class consists of the list of tokens that are the permitted values of the assigned attribute.
* Feature: Enumerated List Class
  * Definition and Usage: This is a class that is identified by the stereotype « EnumeratedList » under which is the name of the enumerated list data-type. The enumeration list class consists of the list of tokens that are the permitted values of the assigned attribute. A list of tokens is permitted using comma separation.
* Feature: PrimitiveType Class
  * Definition and Usage: This is a class that is identified by the stereotype « PrimitiveType » under which is the name of the primitive data-type. A PrimitiveType is one of the many base data-types on which a data model can be built (see Appendix A3.3 for the set of primitive types that are available).
* Feature: Selection Class
  * Definition and Usage: This is a class that is identified by the stereotype « Selection » under which is the name of the data-type. The selection means that only one of the listed attributes make occur in an instance. If this is an abstract class then multiple iterations of the instance may occur and the multiplicity of the attribute defines the constraints on the number of times the attribute can occur in the full instance. If the stereotype and associated name of the class are in italics this denotes the class is abstract.
* Feature: Sequence Class
  * Definition and Usage: This is a class that is identified by the stereotype « Sequence » under which is the name of the data-type. The sequence means that the listed attributes must occur only in the order of the attributes listed on the class. The associated multiplicity defines the number of times the attribute may occur consecutively in the instance. If the stereotype and associated name of the class are in italics this denotes the class is abstract.
* Feature: Unordered Class
  * Definition and Usage: This is a class that is identified by the stereotype « Unordered » under which is the name of the data-type. The unordering means that the listed attributes may occur in any order but the associated multiplicity for the attribute must be followed (when binding to XML this requires the use of Schematron rules to enforce the multiplicity). If the stereotype and associated name of the class are in italics this denotes the class is abstract.
* Feature: List Class
  * Definition and Usage: This is a class that is identified by the stereotype « List » under which is the name of the data-type. A list class is one in which the associated instance will consist of a list of objects that conform to the permitted data-types of the list (the superclasses for the list class). The terms in the list are separated by a space.
* Feature: Union Class
  * Definition and Usage: This is a class that is identified by the stereotype « Union » under which is the name of the data-type. A union class is one in which the associated instance will consist of objects that conform to any of the permitted data-types of the union (the superclasses for the union class).
* Feature: Characteristic Description
  * Definition and Usage: Many classes contain a set of characteristics (the set of characteristics are listed under the stereotype « Characteristics »). Each characteristic description consists of the scope, name, data-type and multiplicity (see Appendix A3.3 for a more complete description). Note that when bound to XSD/XML, a characteristic is mapped to an XML attribute.
* Feature: Attribute Description
  * Definition and Usage: Many classes contain a set of attributes (the set of attributes are listed under the stereotype « Attributes »). Each attribute description consists of the scope, name, data-type and multiplicity (see Appendix A3.3 for a more complete description). Note when bound to XSD/XML, an attribute is mapped to an XML element.
* Feature: Aggregation Arrow
  * Definition and Usage: This is an arrow with a white diamond head to indicate that the child class is an aggregate structure to the parent class i.e. the child class may exist without the context of the parent class. This association allows complex structures to be constructed with common subcomponents.
* Feature: Composition Arrow
  * Definition and Usage: This is an arrow with a filled diamond head to indicate that the child class is a composite structure of the parent class i.e. the child class only exists within the context of the parent class. This association allows complex structures to be constructed with common subcomponents.
* Feature: Generalization Arrow
  * Definition and Usage: This is an arrow with a white arrow head to indicate the class/superclass relationship. The arrow points in the direction of generality i.e. from the class to the super class.


[toc](#toc) | [top](#top)

* * *

### A3.2 Class Descriptions

Table A3.2 provides the key to the descriptions of the data class tables.


Table A3.2 The key to the descriptions of the data class tables.


* Category: Class Name
  * Definition: The name given to the class being described.
* Category: Class Type
  * Definition: The nature of the class. This is described as a "Container [...]" or  "Abstract Container [...]". The value of "..." being (see Appendix A3.1 for the meaning of these values):                                                    "DerivedType"                            "List"                            "Selection"                            "Sequence"                            "Union"                            "Unordered"                                            If the container is also marked as "Mixed" then the children are permitted to include text as well as attributes.                    
* Category: Parents
  * Definition: This is the list of classes that contain the class being described as either the type of a child characteristic or attribute.  In the case of a Root Class the entry is also labeled as "Root Class".
* Category: Derived Classes
  * Definition: The set of classes that are derived from this class (there may be none). The entries are linked to the corresponding class descriptions.
* Category: Super Classes
  * Definition: The set of super classes from which the class being described is derived (there may be none). The entries are linked to the corresponding class descriptions.
* Category: Characteristics
  * Definition: Lists the set of characteristics for this class. The list of characteristics includes those that are inherited. Each characteristic is linked to the corresponding characteristic description table.
* Category: Children
  * Definition: Lists the set of attributes for this class (the only other permitted associations are generalizations).                       The list of children includes those attributes that are inherited. Each child entry is linked to the corresponding                       attribute description table.  The nature of the relationship between the children is defined by the stereotype of                       the parent class i.e. the class type. If the child is in italics this denotes a reference to an abstract class and                       that an instance would NOT contain a child of that name but would be replaced by a complex set of children as                       defined by the associated abstract class. The marking of [P] is used to denote that the attribute has privacy                       implications that will be described in the corresponding description of the attribute.
* Category: Link Data
  * Definition: Lists the set of attributes for this class that are used to provide links to other data objects in the data model. Many types of link references are available. This row is ONLY shown when the class contains at least one link data definition.
* Category: Description
  * Definition: Contains descriptions relating to the class and its properties and relationships.


[toc](#toc) | [top](#top)

* * *

### A3.3 Attribute and Characteristic Descriptions

Table A3.3 provides the key to the descriptions of the data attributes/characteristics for the data classes.


Table A3.3 The key to the descriptions of the data attribute/characteristic tables.


* Category: Attribute Name or Characteristic Name
  * Definition: The name given to the attribute or characteristic being described. If the name is in italics this denotes an abstract attribute or characteristic.
* Category: Data Type
  * Definition: This is the data-type of the attribute or characteristic (if this is in italics it denotes an abstract class). The data-type can take many forms:                                                    Class Name - the name of the Class (this is linked to the class definition elsewhere in this document);                            Primitive Data-types from:-                                                                    AnyTypeLax - the namespace data-type i.e. defining data from any context (this is used for allowing any form of extension and the form of that extension is dependent on the type of binding);                                    AnyURI - the AnyURI data-type (absolute or relative URI);                                    Base - the base data-type for defining a base URI/URL link reference;                                    Boolean - the boolean data-type (with permitted values of "true" and "false");                                    Date - the date data-type (using the [ISO 8601] format);                                    DateTime - the date/time data-type (using the [ISO 8601] format);                                    Decimal - the decimal data-type (a variable precision number that is either positive or negative);                                    Double - the double data-type (double precision floating point number - 64bit);                                    Duration - the duration data-type (using the [ISO 8601] format)                                    Empty - the associated instance must be empty i.e. no child attributes;                                    Float - the float data-type (single precision floating point number - 32bit);                                    ID - the unique identifier data-type (the scope is constrained to the instance file);                                    IDREF - the reference to a previously defined unique identifier data-type (ID);                                    IDREFS - a list, whitespace separated, of references to a previously defined unique identifier data-type (ID);                                    Int - the int data-type with a numeric value from -2147483648 to 2147483647;                                    Integer - the integer data-type (this is derived from the "decimal" data-type i.e. no decimal places);                                    Language - the language data-type as defined in [BCP 47];                                    Name - the Name data-type as per the XML 1.0 definition);                                    Namespace - the namespace data-type i.e. defining data from a context other than that as the default for the data model (this is used for importing other data models);                                    NamespaceLax - the namespace data-type i.e. defining data from a context other than that as the default for the data model (this is used for importing other data models but being lax on the validation);                                    NonNegativeInteger - the non-negative integer data-type (this is derived from the "integer" data-type) i.e. an integer that is zero or higher;                                    NCName - the NCName data-type (derived from the Name data-type i.e. non-colonized name);                                    NormalizedString - the normalized string data type (strings with line feeds, carriage returns and tab characters removed);                                    PositiveInteger - the positive integer data-type (this is derived from the "nonNegativeinteger" data-type) i.e. an integer that is one or higher;                                    String - the normalized string data type;                                    Time - the time data-type (using the [ISO 8601] format).                                                                                                        
* Category: Value Space
  * Definition: The range of valid values for this attribute/characteristic (including any default value). If the value space is unspecified, it is not known or is not important.  This value space must be defined in terms of the associated data-type.
* Category: Scope
  * Definition: This is the scope of the attribute/characteristic with permitted values of:                                                    Local - denoted by "-" and meaning the attribute/characteristic has significance and access within the context of the parent class only;                            Global - denoted by "+" and meaning that the attribute/characteristic has global scoping (so must have a unique name) and can be accessed from anywhere.                                            
* Category: Multiplicity
  * Definition: A property of an attribute/characteristic indicating the number of times it may be used or appear in a given class instance. The values of this property are expressed as a range or shorthand for a range using the notation:                                                    "0..1" [optional; restricted]                            "0..*" [optional; unrestricted]                            "1" [mandatory; restricted]                            "1..*" [mandatory; unrestricted]                                            
* Category: Privacy
  * Definition: Identifies the nature, if any, of the privacy sensitivity. If there are no privacy implications the phrase "There are NO privacy implications is presented". When there are privacy implications the category of the privacy is present (the available terms are defined in Privacy Data Description Appendix Subsection) along with a description of the privacy implications.
* Category: Description
  * Definition: Contains descriptions relating to the attribute/characteristic and its values space.
* Category: Link Data
  * Definition: Contains the description of the link data definition. A link to the corresponding detailed link data description is supplied. This row is ONLY shown when the attribute/characteristic is a link data definition.


[toc](#toc) | [top](#top)

* * *

### A3.4 Enumerated Vocabulary Descriptions

Table A3.4 provides the key to the descriptions of the enumerated vocabulary classes. These are vocabularies that will be contained within the binding form itself. They are contained within a class that has a stereotype of either « Enumeration » or « EnumeratedList ».


Table A3.4 The key to the descriptions of the enumerated vocabulary tables.

|Category  |Definition                                            |
|----------|------------------------------------------------------|
|Term      |The vocabulary token itself i.e. the vocabulary entry.|
|Definition|The meaning of the term and how it should be used.    |


[toc](#toc) | [top](#top)

* * *

### A3.5 External Vocabulary Descriptions

Table A3.5 provides the key to the descriptions of the external vocabulary classes. These are vocabularies that will be contained in some independent format e.g. using the 1EdTech VDEX [\[VDEX, 04\]](#Ref_VDEX04).


Table A3.5 The key to the descriptions of the external vocabulary tables.


* Category: Term
  * Definition: The vocabulary token itself i.e. the vocabulary entry.
* Category: Definition
  * Definition: The meaning of the term and how it should be used. This consists of the "Caption" and "Description" of the vocabulary term. The caption is used to provide a human readable label for the term.


[toc](#toc) | [top](#top)

* * *

### A3.6 Import Class Descriptions

Table A3.6 provides the key to the descriptions of the import classes.


Table A3.6 The key to the descriptions of the imported class tables.


* Category: Import Class Name
  * Definition: The name of the class.
* Category: Parent Classes
  * Definition: The list of parent classes, and the associated children, that use this imported class. Each class and attribute name has a link to its corresponding tabular description in the information model.
* Category: Description
  * Definition: The description of how the class is used within the data model.


[toc](#toc) | [top](#top)

* * *

### A3.7 Link Data Descriptions

Table A3.7 provides the key to the descriptions of the link data definitions.


Table A3.7 The key to the descriptions of the link data tables.


* Category: Target Class Name
  * Definition: This is the name of the target class i.e. the destination point of the link reference.
* Category: Link Type
  * Definition: This is the type of link that is being used. The types of link available are:                                                    "SourcedId" - this link is through interoperability identifier for the target object i.e. the object can be obtained by using this sourcedId with the corresponding service call;                            "IntraParentClassId" - this link is between two attributes/characteristics that are contained within the same parent class;                            "CPResourceId" - this link is to a resource contained within an 1EdTech Content Package/1EdTech Common Cartridge/Thin Common Cartridge manifest. The reference value is that assigned to the "identifier" of the resource in the package/cartridge manifest;                            "CASEItemId" - this link is to the learning objective description (contained within an 1EdTech CASE Item definition).                                            
* Category: Link Sources
  * Definition: This is the set of classes that contain attributes/characteristics which use the link data defined by this entry. A link to the attribute/characteristic is provided.
* Category: Source Attribute
  * Definition: This is the attribute/characteristic in the source object that contains the identifier of the target object (a characteristic name MUST start with an "@"). This will only be supplied if the pointer is contained within a substructure within the source object. If there is no source the statement "Not Applicable" will be displayed.
* Category: Target Attribute
  * Definition: This is the attribute/characteristic in the target class which is the container for the identifier of the object being identified (a characteristic name MUST start with an "@"). It is the value for this identifier which MUST be supplied in the source object. For "CPResourceId" link types the fixed value of "@identifier" will be given. If there is no target the statement "Not Applicable" will be displayed.
* Category: Parent Class Name
  * Definition: This is the name of the class that contains both the source and target attributes/characteristics. This value will only be supplied for the "IntraParentClassId" link types. If there is no parent class name the statement "Not Applicable" will be displayed.
* Category: Description
  * Definition: The description of how the link data is used within the data model.


[toc](#toc) | [top](#top)

* * *

### A3.8 Privacy Data Descriptions

Table A3.8 provides the key to the descriptions of the privacy data definitions.


Table A3.8 The key to the descriptions of the privacy class tables.


* Category: Attribute
  * Definition: The name of the attribute. This is the list of ALL of the attributes in the class and NOT just those which have privacy implications.
* Category: Multiplicity
  * Definition: A property of an attribute/characteristic indicating the number of times it may be used or appear in a given class instance. This information identifies which attributes MAY/MUST NOT be excluded from the data being exchanged. The values of this property are expressed as a range or shorthand for a range using the notation:                                                    "0..1" [optional; restricted] - this attribute MAY be present and so it can be excluded if it contains privacy-sensitive information                            "0..*" [optional; unrestricted] - this attribute MAY be present and so it can be excluded if it contains privacy-sensitive information                            "1" [mandatory; restricted] - this attribute/characteristic MUST be present and the value MUST be of the corresponding data-type                            "1..*" [mandatory; unrestricted] - this attribute/characteristic MUST be present and the value MUST be of the corresponding data-type                                            
* Category: Data-type
  * Definition: The data-type of the attribute (the permitted set of values is listed in the Attribute and Characteristics Descriptions subsection in this Appendix). This information identifies those attributes which MAY be obfuscated and/or encrypted without violating the data-type.
* Category: Privacy Implication
  * Definition: The set of categories that can be applied to an attribute/characteristic:                                                    Accessibility - denotes information about the accessibility personal needs and preferences of the user                            Analytics - denotes information that will be used to support the creation of learning analytics                            Container - denotes that the child attributes have privacy-sensitive information                            Credentials - denotes access control information for the use e.g. password, private key, etc.                            CredentialsIdRef - denotes reference to/use of an identifier to credentials information for the user                            Demographics - denotes information about the demographics of the user e.g. ethnicity, gender, etc.                            Extension - denotes that proprietary information can be included and so this MAY contain privacy-sensitive information                            Financial - denotes that the information is of a financial nature e.g. bank account, financial aid status, etc.                            Identifier - denotes a unique identifier that has been assigned, by some third party, to the user e.g. passport number, social security number, etc.                            IdentifierRef - denotes reference to/use of a unique identifier that has been assigned, by some third party, to the user                            Insurance/Assurance - denotes that the information is about the insurance life-assurance nature, e.g. type of insurance, etc.                            Legal - denotes that the information is of a legal or judicial nature e.g. Will, prison record, etc.                            Medical/Healthcare - denotes that the information is of a medical, or healthcare-related nature e.g. allergies, blood-type, mobility needs, etc.                            N/A - denotes that there are NO PRIVACY IMPLICATIONS for this attribute (this is the default setting)                            Other - denotes privacy sensitive information that is NOT covered by one of the other categories                            Qualification/Certification - denotes that the information is about education qualifications, skill-set certifications, microcredentials, etc.                            Personal - denotes personal information about the user e.g. name, address, etc.                            SourcedId - denotes the interoperability unique identifier that has been assigned and MUST be present for the correct usage of the corresponding 1EdTech specification                            SourcedIdRef - denotes reference to/use of the interoperability unique identifier, sourcedId, to link/point to an associated 1EdTech object                                            
* Category: Description
  * Definition: Details of the nature of the privacy implications.


[toc](#toc) | [top](#top)

* * *

### A3.9 Common Data Model Persistent Identifier Descriptions

Table A3.9 provides the key to the descriptions of the common data model persistent identifier definitions.


Table A3.9 The key to the descriptions of the common data model persistent identifier tables.


* Category: Name
  * Definition: This is the name of the data model component which has been assigned a common data model persistent identifier.
* Category: Type
  * Definition: This is the type of link that is being used. The types of link available are:                                                    "Class (...)" - a complex data model component i.e. it contains one or more properties;                            "Property" - a property of a parent Class;                            "Enumerated Vocabulary Term" - the term/token within an enumerated vocabulary                                            
* Category: Persistent Identifier
  * Definition: The common data model persistent identifier that has been assigned to this data model component. By definition, this is a unique (within the context of the 1EdTech Common Data Model) and very long-lived identifier


[toc](#toc) | [top](#top)

* * *

Appendix B Service Status Codes
-------------------------------

This Section is NORMATIVE

When a behavior-based 1EdTech service model is developed each operation is required to return status information. This status information provides contextual information about the completed success or otherwise of the operation. There are two types of status information that are available to the end-systems:

*   Business transaction - these are the status reports that reflect the business logic of the transactions being exchanged by the end-systems. This status information will be contained within the message header under a specially defined data structure. The status information contained herein is also used to contain any error codes i.e. error reporting is handled as a subset of status information reporting;
*   Messaging/Service Handler faults - this is the messaging/service handler fault codes that are reported by the underlying messaging and web service infrastructure and which are carried in the service message headers.

B1 Definition of the Status Codes
---------------------------------

The status information for the business transactions is carried in a single status information object that contains the following sub-structures:

*   CodeMajor - the major code assigned to the status block (this is a fixed enumerated list). This is used in conjunction with the "Severity";
*   Severity - the severity of the status report (this is a fixed enumerated list). This is used in conjunction with the "CodeMajor";*   CodeMinor - this is a detailed report code structure that is used to identify specific causes of failure. A set of codes can be defined for each transaction ([Appendix B1.3](#AppB1.3)).

The interpretation of the "CodeMajor/Severity" behavior matrix is summarized in Table B1.1.


Table B1.1 Interpretation of the "CodeMajor/Severity" behavior matrix.


* Severity: "Success"
  * CodeMajor: "Processing"
  * "Failure"
  * "Unsupported"
* Severity: "Status"
  * CodeMajor: The transaction request has been completed successfully.
  * The transaction request is being processed at the destination i.e. the request has been received and acknowledged. This combination is used in asynchronous services.
  * The transaction request has failed.  The detailed reason will be reported in the accompanying "codeMinor" fields.
  * The destination service handler does not support the requested operation. This is the required default response for an unsupported operation by an implementation.
* Severity: "Warning"
  * CodeMajor: Some of the request has been completed successfully e.g. partial data storage, etc.
  * The request has been transmitted but acknowledgement of receipt at the destination has not been received. This combination is used in asynchronous services.
  * Not permitted.
  * Not permitted.
* Severity: "Error"
  * CodeMajor: Not permitted.
  * An error has been detected in the immediate transmission communications handler i.e. the message has not left the local end-system.
  * There has been a failure in the end-to-end system communications mechanism and so the request has not been delivered.
  * The destination service handler does not recognise the requested operation i.e. it is an unknown service extension.


### B1.1 Definition of the "CodeMajor" Values

The set of codes used for the "codeMajor" status code field are defined in Table B1.2.


Table B1.2 Definition of the "CodeMajor" status code values.


* Status Code: success
  * Description: Denotes that the request has been successfully completed. If the associated 'severity' value is 'warning' then the request has been partially successful i.e. best effort by the service provider. Other parts of the status information may provide more insight into a partial success response.
* Status Code: processing
  * Description: Denotes that the request is being processed at the destination or there has been a local transmission failure. This value is used in asynchronous services.
* Status Code: failure
  * Description: Denotes that the transaction request has failed. The detailed reason will be reported in the accompanying 'codeMinor' fields.
* Status Code: unsupported
  * Description: Denotes that the service provider does not support the requested operation. This is the required default response for an unsupported operation by an implementation.


### B1.2 Definition of the "Severity" Values

The set of codes used for the "severity" status code field are defined in Table B1.3.


Table B1.3 Definition of the "Severity" status code values.


* Status Code: status
  * Description: The request has been completed and a response was received from the Service Provider.
* Status Code: warning
  * Description: The request has only been partially completed. For an asynchronous service a further response should be expected.
* Status Code: error
  * Description: A significant error has occurred in processing the request and so the request was not completed (the Service Provider may not even have received the request).


### B1.3 Definition of the "CodeMinor" Values

The set of codes used for the "codeMinor" status code field are defined in Table B1.4.


Table B1.4 Definition of the "CodeMinor" status code field values.


* Status Code: createsuccess
  * Description: The request has been fully and successfully implemented by the Service Provider. For a REST binding this will have an HTTP code of '201' for a successful 'PUT' request.
* Status Code: deletesuccess
  * Description: The request has been fully and successfully implemented by the Service Provider. For a REST binding this will have an HTTP code of '204' for a successful 'DELETE' request.
* Status Code: forbidden
  * Description: This is used to indicate that the server can be reached and process the request but refuses to take any further action. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '403'.
* Status Code: fullsuccess
  * Description: The request has been fully and successfully implemented by the Service Provider. For a REST binding this will have an HTTP code of '200' for a successful 'GET' request; '201' for a successful 'PUT' request; '204' for a successful 'DELETE' request.
* Status Code: internal_server_error
  * Description: This should be used only if there is catastrophic error and there is not a more appropriate code. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '500'.
* Status Code: invaliddata
  * Description: This error condition may occur if a JSON request/response body contains well-formed (i.e. syntactically correct), but semantically erroneous, JSON instructions. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and a HTTP code of '422'.
* Status Code: invalid_filter_field
  * Description: An invalid filter field was supplied and so the filtering was not possible. No data has been returned. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '400'.
* Status Code: invalid_selection_field
  * Description: An invalid selection field was supplied and data filtering on the selection criteria was not possible. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '400'.
* Status Code: invalid_sort_field
  * Description: An invalid sort field was supplied and sorting was not possible. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '400'.
* Status Code: invalid_uuid
  * Description: An invalid UUID was supplied. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '404'.
* Status Code: readsuccess
  * Description: The request has been fully and successfully implemented by the Service Provider. For a REST binding this will have an HTTP code of '200' for a successful 'GET' request.
* Status Code: replacesuccess
  * Description: The request has been fully and successfully implemented by the Service Provider. For a REST binding this will have an HTTP code of '201' for a successful 'PUT' request.
* Status Code: server_busy
  * Description: The server is receiving too many requests. Retry at a later time. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '429'.
* Status Code: unauthorised_request
  * Description: The request was not correctly authorised. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '401'.
* Status Code: unknownobject
  * Description: The supplied identifier is unknown in the Service Provider and so the object could not be changed. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '404'.
* Status Code: unsupported
  * Description: Denotes that the service provider does not support the requested operation. This is the required default response for an unsupported operation by an implementation. This would be accompanied by the 'codeMajor/severity' values of 'failure/error' and for a REST binding a HTTP code of '405'.


[toc](#toc) | [top](#top)

* * *

About this Document
-------------------



* Title:: Editors:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: Colin Smythe, 1EdTech (UK)Susan Haught, 1EdTech (USA)Pepper Williams, Common Good Learning Tools (USA)
* Title:: Co-chairs:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: Pepper Williams, Common Good Learning Tools (USA)
* Title:: Version:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: 1.0
* Title:: Version Date:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: 24th January, 2025
* Title:: Status:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: 1EdTech Final Release
* Title:: Summary:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: The 1EdTech Competencies and Academic Standards Exchange (CASE) Service is used to exchange information about the learning and education competencies. This standard defines a set of data models for competency frameworks, competency documents, competency definitions, competency associations, rubrics, rubric criterions and rubric criterion levels. It also describes how this data can be exchanged using a set of service calls. This document contains the information model for the CASE service.
* Title:: Revision Information:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: Version 1.1 - the second release of this specification. There are no changes to the set of endpoints. A small number of new properties have been added to the data model.
* Title:: Purpose:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: For general adoption and implementation.
* Title:: Document Location:
  * 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1: https://www.imsglobal.org/activity/case


[toc](#toc) | [top](#top)

* * *

List of Contributors
--------------------

The following individuals contributed to the development of this document:


|Raymond Baranoski      |Safari Montage (USA)                               |
|-----------------------|---------------------------------------------------|
|Radian Baskoro         |PowerSchool (USA)                                  |
|Diana Bidulescu        |Houston ISD (USA)                                  |
|Diego del Blanco       |Unicon, Inc. (USA)                                 |
|Jared Booth            |HMH (USA)                                          |
|Clyde Boyer            |Trinity Education Group (USA)                      |
|Steve Buettner         |Edina Public Schools (USA)                         |
|Heather Carle          |Territorium (USA)                                  |
|Christine Case         |Trinity Education Group (USA)                      |
|Joseph Chapman         |D2L (Canada)                                       |
|Christian Clark        |Southern New Hampshire University (USA)            |
|Monica Dalvi           |Amplify (USA)                                      |
|Brandon Dorman         |ACT (USA)                                          |
|Davonne Eldridge       |North Dakota Information Technology Deparment (USA)|
|Deb Everhart           |Cengage (USA)                                      |
|Jeramy Gatza           |Florida Virtual School (USA)                       |
|Joe Green              |Territoruim (USA)                                  |
|Lori Griffin           |SAFARI Montage (USA)                               |
|Bob Grogan             |Elumen (USA)                                       |
|Viktor Haag            |Desire2Learn (Canada)                              |
|Jeroen Hamers          |Kennisnet (Netherlands)                            |
|Susan Haught           |1EdTech Consortium (USA)                           |
|Joel Hernandez         |Elumen (USA)                                       |
|Ben Herndon            |PowerSchool (USA)                                  |
|Joshua Heyman          |Southern New Hampshire Universtiy (USA)            |
|Chris Houston          |1EdTech Consortium (USA)                           |
|Jamey Hynds            |Katy ISD (USA)                                     |
|Angela Ingram          |GaDOE (USA)                                        |
|Paul Katula            |Maryland Department of Education (USA)             |
|Lisa Keeter            |Kentucky Department of Education (USA              |
|Christophe Konstantinos|TAO Testing (USA)                                  |
|Tracy Korsmo           |North Dakota Department of Public Instruction (USA)|
|Brian Kubota           |Pearson (USA)                                      |



|Andy Kuritizky   |Edmentum (USA)                              |
|-----------------|--------------------------------------------|
|Emma Lee         |University of Montana (USA)                 |
|Mark Leuba       |1EdTech Consortium (USA)                    |
|Catherine London |Southern New Hampshire University (USA)     |
|Lisa Mattson     |1EdTech Consortium (USA)                    |
|David Mayes      |Gwinnett County Schools (USA)               |
|Michael Moore    |Desire2Learn (Canada)                       |
|Kristen Morton   |PowerSchool (USA)                           |
|Scott Murray     |PowerSchool (USA)                           |
|Henk Nijstad     |Kennisnet (Netherlands)                     |
|Hugh Norwood     |Trinity Education Group (USA)               |
|Keith Osburn     |Georgia Department of Education (USA)       |
|Robert Pangborn  |IBM (USA)                                   |
|Steve Polyak     |ACT (USA)                                   |
|Shana Rafalaski  |SAFARI Montage (USA)                        |
|Jennifer Reichlin|Pearson (USA)                               |
|Bob Schloss      |IBM (USA)                                   |
|McCall Smith     |Instructure (USA)                           |
|Colin Smythe     |1EdTech Consortium (USA)                    |
|Wendy Stephens   |South Carolina Department of Education (USA)|
|Davant Stewart   |Houston ISD (USA)                           |
|Taryn Sullivan   |Google (USA)                                |
|Stewart Sutton   |Dublin Core (USA)                           |
|Carrie Vail      |PowerSchool (USA)                           |
|Marcia van Oplo  |Kennisnet (Netherlands)                     |
|Michele Wagner   |Baltimore County Public Schools (USA)       |
|Brian Wales      |SAFARI Montage (USA)                        |
|Jennifer Whiting |District School Board of Pasco County (USA) |
|Pepper Williams  |Common Good Learning Tools (USA)            |
|Darcy Wither     |Desire2Learn (Canada)                       |
|Avi Yashchin     |IBM (USA)                                   |
|Luke Zenger      |Infinite Campus (USA)                       |


[toc](#toc) | [top](#top)

* * *

Revision History
----------------



* Version No.: Final Release 1.0
  * Release Date: 7th July, 2017
  * Comments: The original Final Release. This declares the standard ready for public adoption.
* Version No.: Final Release 1.1
  * Release Date: 24th January, 2025
  * Comments: This is the second release of this specification. A number of data model changes have been made. There are no changes to the service model i.e. the set of endpoints.
* Version No.:  
  * Release Date:  
  * Comments:  


[toc](#toc) | [top](#top)

* * *

1EdTech Consortium, Inc. ("1EdTech") is publishing the information contained in this document ("Specification") for purposes of scientific, experimental, and scholarly collaboration only.

1EdTech makes no warranty or representation regarding the accuracy or completeness of the Specification.

This material is provided on an "As Is" and "As Available" basis.

The Specification is at all times subject to change and revision without notice.

It is your sole responsibility to evaluate the usefulness, accuracy, and completeness of the Specification as it relates to you.

1EdTech would appreciate receiving your comments and suggestions.

Please contact 1EdTech through our website at [https://www.1edtech.org](https://www.1edtech.org/).

Please refer to Document Name: 1EdTech Competencies and Academic Standards Exchange (CASE) Service 1.1

Date: 24th January, 2025

[toc](#toc) | [top](#top)

* * *