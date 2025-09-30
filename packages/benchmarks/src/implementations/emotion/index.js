import styled from '@emotion/styled';
import createCell from '../../shared/createCell';
import createContainer from '../../shared/createContainer';
import createRow from '../../shared/createRow';
import Box from './Box';
import Dot from './Dot';
import Provider from './Provider';
import View from './View';

// Create components using shared factories
const Cell = createCell(styled, View);
const Container = createContainer(styled, View);
const Row = createRow(styled, View);

export default {
  Box,
  Cell,
  Container,
  Dot,
  Provider,
  Row,
  View,
};
