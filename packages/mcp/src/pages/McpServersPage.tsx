import React from 'react';
import {
  PageSection,
  Title,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { RocketIcon, FilterIcon } from '@patternfly/react-icons';
// Using basic Select for now - SimpleSelect can be added later
// import { SimpleSelect } from '#~/components';

const McpServersPage: React.FC = () => {
  const [searchValue, setSearchValue] = React.useState('');

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              MCP Servers
            </Title>
          </FlexItem>
          <FlexItem>
            <Button variant="primary" icon={<RocketIcon />}>
              Deploy Server
            </Button>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder="Search servers..."
                    value={searchValue}
                    onChange={(_event, value) => setSearchValue(value)}
                    onClear={() => setSearchValue('')}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <span>Registry: All</span>
                </ToolbarItem>
                <ToolbarItem>
                  <span>Transport: All</span>
                </ToolbarItem>
                <ToolbarItem>
                  <span>Tier: All</span>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </CardBody>
        </Card>

        <Grid hasGutter>
          <GridItem span={8}>
            <Card>
              <CardBody>
                <EmptyState>
                  <Title headingLevel="h4" size="lg">
                    No MCP servers found
                  </Title>
                  <EmptyStateBody>
                    No servers are available from the configured registries. Create a registry first
                    to discover and deploy MCP servers, or check if your existing registries are
                    properly synchronized.
                  </EmptyStateBody>
                  <Split hasGutter>
                    <SplitItem>
                      <Button variant="primary" icon={<FilterIcon />}>
                        Browse Registries
                      </Button>
                    </SplitItem>
                    <SplitItem>
                      <Button variant="secondary">Refresh Sync</Button>
                    </SplitItem>
                  </Split>
                </EmptyState>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={4}>
            <Card>
              <CardBody>
                <Title headingLevel="h3" size="md">
                  Deployed Instances
                </Title>
                <EmptyState variant="xs">
                  <Title headingLevel="h4" size="md">
                    No instances running
                  </Title>
                  <EmptyStateBody>Deploy a server to see running instances here.</EmptyStateBody>
                </EmptyState>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};

export default McpServersPage;
