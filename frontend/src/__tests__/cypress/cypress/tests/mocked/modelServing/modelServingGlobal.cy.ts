import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  inferenceServiceModal,
  inferenceServiceModalEdit,
  modelServingGlobal,
  nimDeployModal,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import {
  ConfigMapModel,
  InferenceServiceModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import type { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { ServingRuntimePlatform } from '~/types';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { asClusterAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '~/__tests__/cypress/cypress/utils/pagination';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { mockConfigMap } from '~/__mocks__/mockConfigMap';
import { initIntercepts as initInterceptsForNIM } from '~/__tests__/cypress/cypress/tests/mocked/projects/projectDetails.cy';

type HandlersProps = {
  disableKServeConfig?: boolean;
  disableModelMeshConfig?: boolean;
  projectEnableModelMesh?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
  inferenceServices?: InferenceServiceKind[];
  delayInferenceServices?: boolean;
  delayServingRuntimes?: boolean;
  disableKServeMetrics?: boolean;
  enableNIMModelServing?: boolean;
};

const initIntercepts = ({
  disableKServeConfig,
  disableModelMeshConfig,
  projectEnableModelMesh,
  servingRuntimes = [mockServingRuntimeK8sResource({})],
  inferenceServices = [mockInferenceServiceK8sResource({})],
  delayInferenceServices,
  delayServingRuntimes,
  disableKServeMetrics,
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { kserve: true, 'model-mesh': true },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelMeshConfig,
      disableKServeMetrics,
    }),
  );
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    ServingRuntimeModel,
    mockK8sResourceList(servingRuntimes, { namespace: 'modelServing' }),
  );
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: undefined },
    {
      delay: delayServingRuntimes ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(servingRuntimes),
    },
  ).as('getServingRuntimes');
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'modelServing' },
    mockK8sResourceList(inferenceServices),
  );
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: undefined },
    {
      delay: delayInferenceServices ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(inferenceServices),
    },
  ).as('getInferenceServices');
  cy.interceptK8s(
    'POST',
    { model: InferenceServiceModel, ns: 'test-project' },
    { statusCode: 500 },
  ).as('inferenceServicesError');
  cy.interceptK8sList(
    SecretModel,
    mockK8sResourceList([mockSecretK8sResource({ namespace: 'modelServing' })]),
  );
  cy.interceptK8s(ServingRuntimeModel, mockServingRuntimeK8sResource({}));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
  );
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-1',
          displayName: 'Multi Platform',
          platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'New OVMS Server',
          platforms: [ServingRuntimePlatform.MULTI],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-4',
          displayName: 'Serving Runtime with No Annotations',
        }),
        mockInvalidTemplateK8sResource({}),
      ],
      { namespace: 'opendatahub' },
    ),
  );
};

describe('Model Serving Global', () => {
  it('Empty State No Serving Runtime', () => {
    initIntercepts({
      disableKServeConfig: false,
      disableModelMeshConfig: false,
      projectEnableModelMesh: true,
      servingRuntimes: [],
      inferenceServices: [],
    });

    modelServingGlobal.visit('test-project');

    modelServingGlobal.shouldBeEmpty();

    // Test that the button is enabled
    modelServingGlobal.findGoToProjectButton().should('be.enabled');
  });

  it('Empty State No Inference Service', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      inferenceServices: [],
    });

    modelServingGlobal.visit('test-project');

    modelServingGlobal.shouldBeEmpty();

    modelServingGlobal.findDeployModelButton().click();

    // test that you can not submit on empty
    inferenceServiceModal.shouldBeOpen();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
  });

  it('All projects loading and cancel', () => {
    asClusterAdminUser();
    initIntercepts({
      delayInferenceServices: true,
      delayServingRuntimes: true,
      servingRuntimes: [],
      inferenceServices: [],
    });

    // Visit the all-projects view (no project name passed here)
    modelServingGlobal.visit();

    modelServingGlobal.shouldWaitAndCancel();

    modelServingGlobal.shouldBeEmpty();

    cy.wait('@getServingRuntimes').then((response) => {
      expect(response.error?.message).to.eq('Socket closed before finished writing response');
    });

    cy.wait('@getInferenceServices').then((response) => {
      expect(response.error?.message).to.eq('Socket closed before finished writing response');
    });
  });

  it('Empty State No Project Selected', () => {
    initIntercepts({ inferenceServices: [] });

    // Visit the all-projects view (no project name passed here)
    modelServingGlobal.visit();

    modelServingGlobal.shouldBeEmpty();

    // Test that the button is disabled
    modelServingGlobal.findDeployModelButton().should('have.attr', 'aria-disabled');

    // Test that the tooltip appears on hover of the disabled button
    modelServingGlobal.findDeployModelButton().trigger('mouseenter');
    modelServingGlobal.findNoProjectSelectedTooltip().should('be.visible');
  });

  it('Delete model', () => {
    initIntercepts({});

    cy.interceptK8s(
      'DELETE',
      {
        model: InferenceServiceModel,
        ns: 'test-project',
        name: 'test-inference-service',
      },
      mock200Status({}),
    ).as('deleteModel');

    modelServingGlobal.visit('test-project');

    // user flow for deleting a project
    modelServingGlobal
      .getModelRow('Test Inference Service')
      .findKebabAction(/^Delete/)
      .click();

    // Test that can submit on valid form
    deleteModal.shouldBeOpen();
    deleteModal.findSubmitButton().should('be.disabled');

    deleteModal.findInput().type('Test Inference Service');
    deleteModal.findSubmitButton().should('be.enabled');

    // add trailing space
    deleteModal.findInput().type('x');
    deleteModal.findSubmitButton().should('be.disabled');

    deleteModal.findInput().clear().type('Test Inference Service');
    deleteModal.findSubmitButton().should('be.enabled');

    deleteModal.findSubmitButton().click();

    cy.wait('@deleteModel');
  });

  it('Edit model', () => {
    initIntercepts({});

    cy.interceptK8s(
      'PUT',
      ServingRuntimeModel,
      mockServingRuntimeK8sResource({ name: 'test-model' }),
    ).as('editModel');

    modelServingGlobal.visit('test-project');

    // user flow for editing a project
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    // test that you can not submit on empty
    inferenceServiceModalEdit.shouldBeOpen();
    inferenceServiceModalEdit.findModelNameInput().clear();
    inferenceServiceModalEdit.findLocationPathInput().clear();
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');

    // test with invalid path name
    inferenceServiceModalEdit.findLocationPathInput().type('/');
    inferenceServiceModalEdit
      .findLocationPathInputError()
      .should('be.visible')
      .contains('The path must not point to a root folder');
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');
    inferenceServiceModalEdit.findLocationPathInput().clear();
    inferenceServiceModalEdit.findLocationPathInput().type('test//path');
    inferenceServiceModalEdit
      .findLocationPathInputError()
      .should('be.visible')
      .contains('Invalid path format');
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');
    inferenceServiceModalEdit.findLocationPathInput().clear();

    // test that you can update the name to a different name
    inferenceServiceModalEdit.findModelNameInput().type('Updated Model Name');
    inferenceServiceModalEdit.findLocationPathInput().type('test-model/');
    inferenceServiceModalEdit.findSubmitButton().should('be.enabled');

    // test that user cant upload on an empty new secret
    inferenceServiceModalEdit.findNewDataConnectionOption().click();
    inferenceServiceModalEdit.findLocationPathInput().clear();
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');
    inferenceServiceModalEdit.findLocationPathInput().type('/');
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');

    // test that adding required values validates submit
    inferenceServiceModalEdit.findLocationNameInput().type('Test Name');
    inferenceServiceModalEdit.findLocationAccessKeyInput().type('test-key');
    inferenceServiceModalEdit.findLocationSecretKeyInput().type('test-secret-key');
    inferenceServiceModalEdit.findLocationEndpointInput().type('test-endpoint');
    inferenceServiceModalEdit.findLocationBucketInput().type('test-bucket');
    inferenceServiceModalEdit.findLocationPathInput().clear();
    inferenceServiceModalEdit.findLocationPathInput().type('test-model/');
    inferenceServiceModalEdit.findSubmitButton().should('be.enabled');

    inferenceServiceModalEdit.findSubmitButton().click();

    cy.wait('@editModel').then((interception) => {
      const servingRuntimeMock = mockServingRuntimeK8sResource({ displayName: 'test-model' });
      const servingRuntimeMockNoResources = mockServingRuntimeK8sResource({
        displayName: 'test-model',
        disableResources: true,
        disableReplicas: true,
        disableModelMeshAnnotations: true,
      }); // KServe should send resources in ServingRuntime after migration
      delete servingRuntimeMock.metadata.annotations?.['enable-auth'];
      delete servingRuntimeMock.metadata.annotations?.['enable-route'];
      delete servingRuntimeMock.spec.replicas;
      expect(interception.request.url).to.include('?dryRun=All'); //dry run request
      expect(interception.request.body).to.eql(servingRuntimeMockNoResources);
    });
  });

  it('Create model', () => {
    initIntercepts({
      projectEnableModelMesh: true,
    });

    cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
    cy.interceptK8s(
      'POST',
      InferenceServiceModel,
      mockInferenceServiceK8sResource({
        name: 'test-name',
        path: 'test-model/',
        displayName: 'Test Name',
        isModelMesh: true,
      }),
    ).as('createInferenceService');

    modelServingGlobal.visit('test-project');

    modelServingGlobal.findDeployModelButton().click();

    // test that you can not submit on empty
    inferenceServiceModal.shouldBeOpen();
    inferenceServiceModal.findSubmitButton().should('be.disabled');

    // test filling in minimum required fields
    inferenceServiceModal.findModelNameInput().type('Test Name');
    inferenceServiceModal.findServingRuntimeSelect().findSelectOption('OVMS Model Serving').click();
    inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');
    inferenceServiceModal.findNewDataConnectionOption().click();
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().type('/');
    inferenceServiceModal
      .findLocationPathInputError()
      .should('be.visible')
      .contains('The path must not point to a root folder');
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findLocationPathInput().type('test//path');
    inferenceServiceModal
      .findLocationPathInputError()
      .should('be.visible')
      .contains('Invalid path format');
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findLocationNameInput().type('Test Name');
    inferenceServiceModal.findLocationAccessKeyInput().type('test-key');
    inferenceServiceModal.findLocationSecretKeyInput().type('test-secret-key');
    inferenceServiceModal.findLocationEndpointInput().type('test-endpoint');
    inferenceServiceModal.findLocationBucketInput().type('test-bucket');
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');

    inferenceServiceModal.findSubmitButton().click();

    //dry run request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-name',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {
            'openshift.io/display-name': 'Test Name',
            'serving.kserve.io/deploymentMode': 'ModelMesh',
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'onnx', version: '1' },
              runtime: 'test-model',
              storage: { key: 'test-secret', path: 'test-model/' },
            },
          },
        },
      });
    });

    // Actaul request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry run request and 1 actaul request
    });
  });

  it('Create NIM model', () => {
    initInterceptsForNIM({
      templates: true,
      disableKServeConfig: false,
      disableModelConfig: false,
      disableNIMModelServing: false,
    });

    cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
    cy.interceptK8s(
      'POST',
      InferenceServiceModel,
      mockInferenceServiceK8sResource({
        name: 'test-name',
        path: 'test-model/',
        modelName: 'llama-2-13b-chat',
        runtimeName: 'test-name',
        displayName: 'Test Name',
        isModelMesh: true,
      }),
    ).as('createInferenceService');

    cy.interceptK8s(
      'POST',
      ServingRuntimeModel,
      mockServingRuntimeK8sResource({
        templateDisplayName: 'NVIDIA NIM',
        templateName: 'nvidia-nim-runtime',
      }),
    ).as('createServingRuntime');

    cy.interceptK8s(
      ConfigMapModel,
      mockConfigMap({
        data: {
          alphafold2:
            '{\n "name": "alphafold2",\n "displayName": "AlphaFold2",\n "shortDescription": "A widely used model for predicting the 3D structures of proteins from their amino acid sequences.",\n "namespace": "nim/deepmind",\n "tags": [\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-27T01:51:55.642Z"\n}',
          'arctic-embed-l':
            '{\n "name": "arctic-embed-l",\n "displayName": "Snowflake Arctic Embed Large Embedding",\n "shortDescription": "NVIDIA NIM for GPU accelerated Snowflake Arctic Embed Large Embedding inference",\n "namespace": "nim/snowflake",\n "tags": [\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.1",\n "updatedDate": "2024-07-27T00:38:40.927Z"\n}',
          diffdock:
            '{\n "name": "diffdock",\n "displayName": "DiffDock",\n "shortDescription": "Diffdock predicts the 3D structure of the interaction between a molecule and a protein.",\n "namespace": "nim/mit",\n "tags": [\n "1.2.0"\n ],\n "latestTag": "1.2.0",\n "updatedDate": "2024-07-31T01:07:09.680Z"\n}',
          'fastpitch-hifigan-tts':
            '{\n "name": "fastpitch-hifigan-tts",\n "displayName": "TTS FastPitch HifiGAN Riva",\n "shortDescription": "RIVA TTS NIM provide easy access to state-of-the-art text to speech models, capable of synthesizing English speech from text",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-06T16:18:02.346Z"\n}',
          'llama-2-13b-chat':
            '{\n "name": "llama-2-13b-chat",\n "displayName": "meta-llama-2-13b-chat",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 2 13B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1",\n "1.0",\n "latest"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-21T16:10:56.252Z"\n}',
          'llama-2-70b-chat':
            '{\n "name": "llama-2-70b-chat",\n "displayName": "meta-llama-2-70b-chat",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 2 70B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "latest"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-21T16:09:42.812Z"\n}',
          'llama-2-7b-chat':
            '{\n "name": "llama-2-7b-chat",\n "displayName": "meta-llama-2-7b-chat",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 2 7B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "latest"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-21T16:09:01.084Z"\n}',
          'llama-3-taiwan-70b-instruct':
            '{\n "name": "llama-3-taiwan-70b-instruct",\n "displayName": "Llama-3-Taiwan-70B-Instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama-3-Taiwan-70B-Instruct inference through OpenAI compatible APIs",\n "namespace": "nim/yentinglin",\n "tags": [\n "latest",\n "1.1.2",\n "1.1",\n "1"\n ],\n "latestTag": "latest",\n "updatedDate": "2024-08-28T03:24:13.146Z"\n}',
          'llama-3.1-405b-instruct':
            '{\n "name": "llama-3.1-405b-instruct",\n "displayName": "Llama-3.1-405b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3.1 405B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.2.0",\n "1.2",\n "1.1.2",\n "1.1",\n "1",\n "latest",\n "1.1.0"\n ],\n "latestTag": "1.2.0",\n "updatedDate": "2024-09-11T03:47:21.693Z"\n}',
          'llama-3.1-70b-instruct':
            '{\n "name": "llama-3.1-70b-instruct",\n "displayName": "Llama-3.1-70b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3.1 70B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.2.1",\n "1.2",\n "1.1.2",\n "1.1.1",\n "1.1",\n "1",\n "latest",\n "1.1.0"\n ],\n "latestTag": "1.2",\n "updatedDate": "2024-09-20T22:01:11.799Z"\n}',
          'llama-3.1-8b-base':
            '{\n "name": "llama-3.1-8b-base",\n "displayName": "Llama-3.1-8b-base",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3.1 8B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.1.2",\n "1.1.1",\n "1.1",\n "1",\n "latest",\n "1.1.0"\n ],\n "latestTag": "1.1.2",\n "updatedDate": "2024-08-21T15:54:19.302Z"\n}',
          'llama3-70b-instruct':
            '{\n "name": "llama3-70b-instruct",\n "displayName": "Meta/Llama3-70b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3 70B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "1.0.1",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-09-23T18:15:48.418Z"\n}',
          'llama3-8b-instruct':
            '{\n "name": "llama3-8b-instruct",\n "displayName": "Meta/Llama3-8b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3 8B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-03T21:47:11.384Z"\n}',
          'megatron-1b-nmt':
            '{\n "name": "megatron-1b-nmt",\n "displayName": "NMT Megatron Riva 1b",\n "shortDescription": "Riva NMT NIM provide easy access to state-of-the-art neural machine translation (NMT) models, capable of translating text from one language to another with exceptional accuracy.",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-06T01:30:36.789Z"\n}',
          'mistral-7b-instruct-v0.3':
            '{\n "name": "mistral-7b-instruct-v0.3",\n "displayName": "Mistral-7B-Instruct-v0.3",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mistral-7B-Instruct-v0.3 inference through OpenAI compatible APIs",\n "namespace": "nim/mistralai",\n "tags": [\n "1.1",\n "1.1.2",\n "1",\n "latest"\n ],\n "latestTag": "latest",\n "updatedDate": "2024-09-10T16:21:20.547Z"\n}',
          'mistral-nemo-12b-instruct':
            '{\n "name": "mistral-nemo-12b-instruct",\n "displayName": "Mistral-Nemo-12B-Instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mistral-NeMo-12B-Instruct inference through OpenAI compatible APIs",\n "namespace": "nim/nv-mistralai",\n "tags": [\n "1.2",\n "1.2.2",\n "1",\n "latest"\n ],\n "latestTag": "1.2",\n "updatedDate": "2024-09-26T19:10:40.237Z"\n}',
          'mixtral-8x22b-instruct-v01':
            '{\n "name": "mixtral-8x22b-instruct-v01",\n "displayName": "Mixtral-8x22B-Instruct-v0.1",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mixtral-8x22B-Instruct-v0.1 inference through OpenAI compatible APIs",\n "namespace": "nim/mistralai",\n "tags": [\n "1.2.2",\n "1",\n "1.2",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.2.2",\n "updatedDate": "2024-09-26T23:51:49.835Z"\n}',
          'mixtral-8x7b-instruct-v01':
            '{\n "name": "mixtral-8x7b-instruct-v01",\n "displayName": "Mixtral-8x7B-Instruct-v0.1",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mixtral-8x7B-Instruct-v0.1 inference through OpenAI compatible APIs",\n "namespace": "nim/mistralai",\n "tags": [\n "1.2.1",\n "1",\n "1.2",\n "1.0.0",\n "latest"\n ],\n "latestTag": "1.2.1",\n "updatedDate": "2024-09-20T21:57:44.596Z"\n}',
          molmim:
            '{\n "name": "molmim",\n "displayName": "MolMIM",\n "shortDescription": "MolMIM is a transformer-based model developed by NVIDIA for controlled small molecule generation.",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-09-23T18:19:56.199Z"\n}',
          'nemotron-4-340b-instruct':
            '{\n "name": "nemotron-4-340b-instruct",\n "displayName": "nemotron-4-340b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Nemotron-4-340B-Instruct inference through OpenAI compatible APIs",\n "namespace": "nim/nvidia",\n "tags": [\n "latest",\n "1.1.2",\n "1.1",\n "1"\n ],\n "latestTag": "1.1.2",\n "updatedDate": "2024-08-29T18:33:09.615Z"\n}',
          'nv-embedqa-e5-v5':
            '{\n "name": "nv-embedqa-e5-v5",\n "displayName": "NVIDIA Retrieval QA E5 Embedding v5",\n "shortDescription": "NVIDIA NIM for GPU accelerated NVIDIA Retrieval QA E5 Embedding v5 inference",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.1",\n "updatedDate": "2024-07-27T00:37:35.717Z"\n}',
          'nv-embedqa-mistral-7b-v2':
            '{\n "name": "nv-embedqa-mistral-7b-v2",\n "displayName": "NVIDIA Retrieval QA Mistral 7B Embedding v2",\n "shortDescription": "NVIDIA NIM for GPU accelerated NVIDIA Retrieval QA Mistral 7B Embedding v2 inference",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.1",\n "updatedDate": "2024-07-27T00:38:04.698Z"\n}',
          'nv-rerankqa-mistral-4b-v3':
            '{\n "name": "nv-rerankqa-mistral-4b-v3",\n "displayName": "NVIDIA Retrieval QA Mistral 4B Reranking v3",\n "shortDescription": "NVIDIA NIM for GPU accelerated NVIDIA Retrieval QA Mistral 4B Reranking v3 inference",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.2",\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.2",\n "updatedDate": "2024-08-06T21:57:16.255Z"\n}',
          'parakeet-ctc-1.1b-asr':
            '{\n "name": "parakeet-ctc-1.1b-asr",\n "displayName": "ASR Parakeet CTC Riva 1.1b",\n "shortDescription": "RIVA ASR NIM delivers accurate English speech-to-text transcription and enables easy-to-use optimized ASR inference for large scale deployments.",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-07T05:12:53.897Z"\n}',
          proteinmpnn:
            '{\n "name": "proteinmpnn",\n "displayName": "ProteinMPNN",\n "shortDescription": "Predicts amino acid sequences from 3D structure of proteins.",\n "namespace": "nim/ipd",\n "tags": [\n "1",\n "1.0",\n "1.0.0"\n ],\n "latestTag": "1",\n "updatedDate": "2024-08-27T01:52:07.955Z"\n}',
        },
        namespace: 'opendatahub',
        name: 'nvidia-nim-images-data',
      }),
    );
    projectDetails.visitSection('test-project', 'model-server');
    projectDetails.findNimModelDeployButton().click();
    cy.contains('Deploy model with NVIDIA NIM').should('be.visible');

    // test that you can not submit on empty
    nimDeployModal.shouldBeOpen();
    nimDeployModal.findSubmitButton().should('be.disabled');

    // test filling in minimum required fields
    nimDeployModal.findModelNameInput().type('Test Name');
    nimDeployModal.findNIMToDeploy().findSelectOption('meta-llama-2-13b-chat - latest').click();
    nimDeployModal.findSubmitButton().should('be.enabled');

    nimDeployModal.findSubmitButton().click();

    //dry run request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-name',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {
            'openshift.io/display-name': 'Test Name',
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'llama-2-13b-chat' },
              runtime: 'test-name',
              storage: { key: 'test-secret', path: 'test-model/' },
            },
            resources: {
              limits: { cpu: '2', memory: '8Gi' },
              requests: { cpu: '1', memory: '4Gi' },
            },
          },
        },
      });
    });

    // Actual request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry run request and 1 actual request
    });
  });

  it('Create model error', () => {
    initIntercepts({
      projectEnableModelMesh: true,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.findDeployModelButton().click();

    // test that you can not submit on empty
    inferenceServiceModal.shouldBeOpen();
    inferenceServiceModal.findSubmitButton().should('be.disabled');

    // test filling in minimum required fields
    inferenceServiceModal.findModelNameInput().type('trigger-error');
    inferenceServiceModal.findServingRuntimeSelect().findSelectOption('OVMS Model Serving').click();
    inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');

    // Submit and check the invalid error message
    inferenceServiceModal.findSubmitButton().click();

    cy.wait('@inferenceServicesError').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'trigger-error',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {
            'openshift.io/display-name': 'trigger-error',
            'serving.kserve.io/deploymentMode': 'ModelMesh',
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'onnx', version: '1' },
              runtime: 'test-model',
              storage: { key: 'test-secret', path: 'test-model/test-model/' },
            },
          },
        },
      });
    });

    cy.findByText('Error creating model server');

    // Close the modal
    inferenceServiceModal.findCancelButton().click();

    // Check that the error message is gone
    modelServingGlobal.findDeployModelButton().click();
    cy.findByText('Error creating model server').should('not.exist');
  });
  it('Navigate to kserve model metrics page only if enabled', () => {
    initIntercepts({});
    modelServingGlobal.visit('test-project');

    // Verify initial run rows exist
    modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);
    modelServingGlobal.getModelMetricLink('Test Inference Service').should('not.exist');

    initIntercepts({ disableKServeMetrics: false });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);
    modelServingGlobal.getModelMetricLink('Test Inference Service').should('be.visible');
    modelServingGlobal.getModelMetricLink('Test Inference Service').click();
    cy.findByTestId('app-page-title').should('have.text', 'Test Inference Service metrics');
  });

  describe('Table filter and pagination', () => {
    it('filter by name', () => {
      initIntercepts({});
      modelServingGlobal.visit('test-project');

      // Verify initial run rows exist
      modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);

      // Select the "Name" filter
      const modelServingGlobalToolbar = modelServingGlobal.getTableToolbar();
      modelServingGlobalToolbar.findFilterMenuOption('filter-dropdown-select', 'Name').click();
      modelServingGlobalToolbar.findSearchInput().type('Test Inference Service');
      // Verify only rows with the typed run name exist
      modelServingGlobal.getModelRow('Test Inference Service').should('exist');
      // Verify sort button works
      modelServingGlobal.findSortButton('Model name').click();
      modelServingGlobal.findSortButton('Model name').should(be.sortDescending);
      modelServingGlobal.findSortButton('Model name').click();
      modelServingGlobal.findSortButton('Model name').should(be.sortAscending);

      // Search for non-existent run name
      modelServingGlobalToolbar.findSearchInput().clear().type('Test Service');

      // Verify no results were found
      modelServingGlobal.findEmptyResults().should('exist');
    });

    it('filter by project', () => {
      initIntercepts({
        projectEnableModelMesh: true,
      });
      modelServingGlobal.visit('test-project');

      // Verify initial run rows exist
      modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);

      // Select the "Project" filter
      const modelServingGlobalToolbar = modelServingGlobal.getTableToolbar();
      modelServingGlobalToolbar.findFilterMenuOption('filter-dropdown-select', 'Project').click();
      modelServingGlobalToolbar.findSearchInput().type('test project');
      // Verify only rows with the typed run name exist
      modelServingGlobal.getModelRow('Test Inference Service').should('exist');
      // Verify sort button works
      modelServingGlobal.findSortButton('Project').click();
      modelServingGlobal.findSortButton('Project').should(be.sortAscending);
      modelServingGlobal.findSortButton('Project').click();
      modelServingGlobal.findSortButton('Project').should(be.sortDescending);

      // Search for non-existent run name
      modelServingGlobalToolbar.findSearchInput().clear().type('Test Service');

      // Verify no results were found
      modelServingGlobal.findEmptyResults().should('exist');
    });

    it('Validate pagination', () => {
      const totalItems = 50;
      const mockInferenceService: InferenceServiceKind[] = Array.from(
        { length: totalItems },
        (_, i) =>
          mockInferenceServiceK8sResource({
            displayName: `Test Inference Service-${i}`,
          }),
      );
      initIntercepts({ inferenceServices: mockInferenceService });
      modelServingGlobal.visit('test-project');

      // top pagination
      testPagination({
        totalItems,
        firstElement: 'Test Inference Service-0',
        paginationVariant: 'top',
      });

      // bottom pagination
      testPagination({
        totalItems,
        firstElement: 'Test Inference Service-0',
        paginationVariant: 'bottom',
      });
    });
  });
});
