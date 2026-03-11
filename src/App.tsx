import { useState } from 'react';
import { Box, Container, Heading, Text, Grid, GridItem } from '@chakra-ui/react';
import PrivacyBanner from './components/PrivacyBanner';
import FormSection from './components/FormSection';
import URLPreview from './components/URLPreview';
import QRGenerator from './components/QRGenerator';

interface FormData {
  targetUrl: string;
  channel: string;
  addPodcast: boolean;
  podcastName: string;
  addEvent: boolean;
  eventName: string;
  motivationAngle: string[];
  searchContext: string[];
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    targetUrl: '',
    channel: '',
    addPodcast: false,
    podcastName: '',
    addEvent: false,
    eventName: '',
    motivationAngle: [],
    searchContext: [],
  });

  const handleFormChange = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const generateTaggedUrl = (): string => {
    if (!formData.targetUrl) return '';

    const params = new URLSearchParams();
    params.append('utm_source', formData.addPodcast ? formData.podcastName : formData.channel);
    params.append('utm_medium', 'social');
    params.append('utm_campaign', formData.addEvent ? formData.eventName : formData.channel);
    params.append('utm_content', formData.motivationAngle.join(',') || 'general');
    params.append('utm_term', formData.searchContext.join(',') || 'general');

    const url = new URL(formData.targetUrl);
    url.search = params.toString();
    return url.toString();
  };

  const taggedUrl = generateTaggedUrl();

  return (
    <Box minH="100vh" bg="gray.50">
      <PrivacyBanner />
      
      <Container maxW="7xl" py={{ base: 8, md: 12 }} px={4}>
        {/* Header */}
        <Box mb={12} textAlign="center">
          <Heading as="h1" size="2xl" color="gray.900" mb={4}>
            Marketing Attribution & QR Generator
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Create tracked URLs and custom QR codes for TrialMe campaigns
          </Text>
        </Box>

        {/* Main Content Grid */}
        <Grid
          templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
          gap={8}
        >
          {/* Left Column - Form Section */}
          <GridItem>
            <FormSection formData={formData} onFormChange={handleFormChange} />
            
            {/* URL Preview */}
            {taggedUrl && (
              <Box mt={6}>
                <URLPreview url={taggedUrl} />
              </Box>
            )}
          </GridItem>

          {/* Right Column - QR Code Generator */}
          <GridItem>
            <QRGenerator url={taggedUrl} />
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
