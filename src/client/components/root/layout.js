import {BrowserRouter, Route, Switch} from 'react-router-dom';
import {withPave} from 'pave-react';
import MainLayout from '../main/layout';
import Meta from '../meta';
import React from 'react';
import store from '../../utils/store';

const render = () =>
  <BrowserRouter>
    <Meta title='Bruteball'>
      <Switch>
        <Route path='/games/:id' component={MainLayout} />
        <Route component={MainLayout} />
      </Switch>
    </Meta>
  </BrowserRouter>;

export default withPave(props => render({props}), {store});
