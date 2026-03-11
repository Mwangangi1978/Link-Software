import React from 'react';
import {
  Box,
  Input,
  Heading,
} from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { Select } from '@chakra-ui/select';
import { Checkbox } from '@chakra-ui/checkbox';
import { Radio, RadioGroup } from '@chakra-ui/radio';

interface FormSectionProps {
  formData: {
    targetUrl: string;
    channel: string;
    addPodcast: boolean;
    podcastName: string;
    addEvent: boolean;
    eventName: string;
    motivationAngle: string;
    searchContext: string;
  };
  onFormChange: (updates: any) => void;
}

const FormSection: React.FC<FormSectionProps> = ({ formData, onFormChange }) => {
  const handleInputChange = (field: string, value: any) => {
    onFormChange({ [field]: value });
  };

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" p={8}>
      <Heading as="h2" size="lg" mb={6} color="gray.900">
        Campaign Configuration
      </Heading>

      <Box>
        {/* Target URL */}
        <FormControl isRequired mb={6}>
          <FormLabel fontWeight="semibold" color="gray.700">
            Target URL
          </FormLabel>
          <Input
            type="url"
            value={formData.targetUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('targetUrl', e.target.value)}
            placeholder="https://www.trialme.com/landing"
            size="lg"
          />
        </FormControl>

        {/* Channel Selection */}
        <FormControl mb={6}>
          <FormLabel fontWeight="semibold" color="gray.700">
            Channel
          </FormLabel>
          <Select
            value={formData.channel}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('channel', e.target.value)}
            size="lg"
          >
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="TikTok">TikTok</option>
            <option value="YouTube">YouTube</option>
          </Select>
        </FormControl>

        {/* External Sources - Podcast */}
        <Box bg="gray.100" p={4} borderRadius="md" mb={6}>
          <FormControl display="flex" alignItems="center" mb={formData.addPodcast ? 3 : 0}>
            <Checkbox
              isChecked={formData.addPodcast}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('addPodcast', e.target.checked)}
              colorScheme="blue"
            >
              <FormLabel mb={0} fontWeight="semibold" color="gray.700" cursor="pointer">
                Add Podcast Attribution
              </FormLabel>
            </Checkbox>
          </FormControl>
          {formData.addPodcast && (
            <Box ml={6}>
              <Input
                type="text"
                value={formData.podcastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('podcastName', e.target.value)}
                placeholder="Podcast Name"
                size="sm"
              />
            </Box>
          )}
        </Box>

        {/* External Sources - Live Event */}
        <Box bg="gray.100" p={4} borderRadius="md" mb={6}>
          <FormControl display="flex" alignItems="center" mb={formData.addEvent ? 3 : 0}>
            <Checkbox
              isChecked={formData.addEvent}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('addEvent', e.target.checked)}
              colorScheme="blue"
            >
              <FormLabel mb={0} fontWeight="semibold" color="gray.700" cursor="pointer">
                Add Event Attribution
              </FormLabel>
            </Checkbox>
          </FormControl>
          {formData.addEvent && (
            <Box ml={6}>
              <Input
                type="text"
                value={formData.eventName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('eventName', e.target.value)}
                placeholder="Event Name/Location"
                size="sm"
              />
            </Box>
          )}
        </Box>

        {/* Motivation Angle */}
        <FormControl mb={6}>
          <FormLabel fontWeight="semibold" color="gray.700">
            Motivation Angle
          </FormLabel>
          <Select
            value={formData.motivationAngle}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('motivationAngle', e.target.value)}
            size="lg"
          >
            <option value="Educational">Educational</option>
            <option value="Financial Incentive">Financial Incentive</option>
            <option value="Altruistic/Community">Altruistic/Community</option>
            <option value="Personal Health">Personal Health</option>
          </Select>
        </FormControl>

        {/* Search Context */}
        <FormControl>
          <FormLabel fontWeight="semibold" color="gray.700" mb={3}>
            Search Context
          </FormLabel>
          <RadioGroup value={formData.searchContext} onChange={(value: string) => handleInputChange('searchContext', value)}>
            <Radio value="self" colorScheme="blue" mb={2}>
              Looking for self
            </Radio>
            <Radio value="others" colorScheme="blue">
              Looking for someone else
            </Radio>
          </RadioGroup>
        </FormControl>
      </Box>
    </Box>
  );
};

export default FormSection;
