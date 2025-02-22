import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import Table from '..';
import Checkbox from '../../checkbox';
import { resetWarned } from '../../_util/warning';
import ConfigProvider from '../../config-provider';
import { render } from '../../../tests/utils';

describe('Table.rowSelection', () => {
  window.requestAnimationFrame = callback => window.setTimeout(callback, 16);
  window.cancelAnimationFrame = window.clearTimeout;

  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    errorSpy.mockReset();
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
    },
  ];

  const data = [
    { key: 0, name: 'Jack' },
    { key: 1, name: 'Lucy' },
    { key: 2, name: 'Tom' },
    { key: 3, name: 'Jerry' },
  ];

  function createTable(props = {}) {
    return <Table columns={columns} dataSource={data} rowSelection={{}} {...props} />;
  }

  function renderedNames(wrapper) {
    return wrapper.find('BodyRow').map(row => row.props().record.name);
  }

  function getSelections(wrapper) {
    return wrapper
      .find('BodyRow')
      .map(row => {
        const { key } = row.props().record;
        if (!row.find('input').at(0).props().checked) {
          return null;
        }

        return key;
      })
      .filter(key => key !== null);
  }

  function getIndeterminateSelection(wrapper) {
    return wrapper
      .find('BodyRow')
      .map(row => {
        const { key } = row.props().record;
        if (!row.find('Checkbox').at(0).props().indeterminate) {
          return null;
        }

        return key;
      })
      .filter(key => key !== null);
  }

  it('select default row', () => {
    const wrapper = mount(createTable({ rowSelection: { defaultSelectedRowKeys: [0] } }));
    const checkboxes = wrapper.find('input');

    expect(getSelections(wrapper)).toEqual([0]);

    checkboxes.at(1).simulate('change', { target: { checked: false } });
    expect(getSelections(wrapper)).toEqual([]);

    checkboxes.at(0).simulate('change', { target: { checked: true } });
    expect(getSelections(wrapper)).toEqual([0, 1, 2, 3]);

    checkboxes.at(0).simulate('change', { target: { checked: false } });
    expect(getSelections(wrapper)).toEqual([]);
  });

  it('select by checkbox', () => {
    const wrapper = mount(createTable());
    const checkboxes = wrapper.find('input');
    const checkboxAll = checkboxes.first();

    checkboxAll.simulate('change', { target: { checked: true } });
    expect(getSelections(wrapper)).toEqual([0, 1, 2, 3]);

    checkboxes.at(1).simulate('change', { target: { checked: false } });
    expect(getSelections(wrapper)).toEqual([1, 2, 3]);

    checkboxes.at(1).simulate('change', { target: { checked: true } });
    expect(getSelections(wrapper)).toEqual([0, 1, 2, 3]);
  });

  it('select by radio', () => {
    const wrapper = mount(createTable({ rowSelection: { type: 'radio' } }));
    const radios = wrapper.find('input');

    expect(radios.length).toBe(4);
    radios.first().simulate('click');
    radios.first().simulate('change', { target: { checked: true } });
    expect(getSelections(wrapper)).toEqual([0]);

    radios.last().simulate('change', { target: { checked: true } });
    expect(getSelections(wrapper)).toEqual([3]);
  });

  it('pass getCheckboxProps to checkbox', () => {
    const rowSelection = {
      getCheckboxProps: record => ({
        disabled: record.name === 'Lucy',
        indeterminate: record.name === 'Tom',
        name: record.name,
      }),
    };

    const wrapper = mount(createTable({ rowSelection }));
    const checkboxes = wrapper.find('input');

    expect(checkboxes.at(1).props().disabled).toBe(false);
    expect(checkboxes.at(1).props().name).toEqual(data[0].name);
    expect(checkboxes.at(2).props().disabled).toBe(true);
    expect(checkboxes.at(2).props().name).toEqual(data[1].name);

    expect(getIndeterminateSelection(wrapper)).toEqual([2]);
  });

  it("make getCheckboxProps's `indeterminate` override selectedRowKeys' effect", () => {
    const rowSelection = {
      getCheckboxProps: record => ({
        disabled: record.name === 'Lucy',
        indeterminate: record.name === 'Tom',
        name: record.name,
      }),
      selectedRowKeys: [2],
    };

    const wrapper = mount(createTable({ rowSelection }));
    expect(getIndeterminateSelection(wrapper)).toEqual([2]);
  });

  it('works with pagination', () => {
    const wrapper = mount(createTable({ pagination: { pageSize: 2 } }));
    const pagers = wrapper.find('Pager');

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { checked: true } });
    expect(wrapper.find('Checkbox').first().props()).toEqual(
      expect.objectContaining({ checked: true, indeterminate: false }),
    );

    pagers.at(1).simulate('click');
    expect(wrapper.find('Checkbox').first().props()).toEqual(
      expect.objectContaining({ checked: false, indeterminate: false }),
    );

    pagers.at(0).simulate('click');
    expect(wrapper.find('Checkbox').first().props()).toEqual(
      expect.objectContaining({ checked: true, indeterminate: false }),
    );
  });

  // https://github.com/ant-design/ant-design/issues/4020
  it('handles defaultChecked', () => {
    resetWarned();
    const rowSelection = {
      getCheckboxProps: record => ({
        defaultChecked: record.key === 0,
      }),
    };

    mount(createTable({ rowSelection }));

    expect(errorSpy).toHaveBeenCalledWith(
      'Warning: [antd: Table] Do not set `checked` or `defaultChecked` in `getCheckboxProps`. Please use `selectedRowKeys` instead.',
    );
  });

  it('can be controlled', () => {
    const wrapper = mount(createTable({ rowSelection: { selectedRowKeys: [0] } }));

    expect(getSelections(wrapper)).toEqual([0]);

    wrapper.setProps({ rowSelection: { selectedRowKeys: [1] } });

    expect(getSelections(wrapper)).toEqual([1]);
  });

  it('fires change & select events', () => {
    const order = [];
    const handleChange = jest.fn().mockImplementation(() => {
      order.push('onChange');
    });
    const handleSelect = jest.fn().mockImplementation(() => {
      order.push('onSelect');
    });
    const rowSelection = {
      onChange: handleChange,
      onSelect: handleSelect,
    };
    const wrapper = mount(createTable({ rowSelection }));

    wrapper
      .find('input')
      .last()
      .simulate('change', { target: { checked: true } });

    expect(handleChange).toHaveBeenCalledWith([3], [{ key: 3, name: 'Jerry' }]);
    expect(handleSelect.mock.calls.length).toBe(1);
    expect(handleSelect.mock.calls[0][0]).toEqual({ key: 3, name: 'Jerry' });
    expect(handleSelect.mock.calls[0][1]).toEqual(true);
    expect(handleSelect.mock.calls[0][2]).toEqual([{ key: 3, name: 'Jerry' }]);
    expect(handleSelect.mock.calls[0][3].type).toBe('change');
    expect(order).toEqual(['onSelect', 'onChange']);
  });

  it('fires selectMulti event', () => {
    const order = [];
    const handleSelectMulti = jest.fn().mockImplementation(() => {
      order.push('onSelectMultiple');
    });
    const handleSelect = jest.fn().mockImplementation(() => {
      order.push('onSelect');
    });
    const handleChange = jest.fn().mockImplementation(() => {
      order.push('onChange');
    });
    const rowSelection = {
      onChange: handleChange,
      onSelect: handleSelect,
      onSelectMultiple: handleSelectMulti,
    };
    const wrapper = mount(createTable({ rowSelection }));

    wrapper
      .find('input')
      .at(1)
      .simulate('change', {
        target: { checked: true },
        nativeEvent: { shiftKey: true },
      });
    expect(handleSelect).toHaveBeenCalled();

    wrapper
      .find('input')
      .at(3)
      .simulate('change', {
        target: { checked: true },
        nativeEvent: { shiftKey: true },
      });
    expect(handleSelectMulti).toHaveBeenCalledWith(
      true,
      [data[0], data[1], data[2]],
      [data[1], data[2]],
    );

    wrapper
      .find('input')
      .at(1)
      .simulate('change', {
        target: { checked: false },
        nativeEvent: { shiftKey: true },
      });
    expect(handleSelectMulti).toHaveBeenCalledWith(false, [], [data[0], data[1], data[2]]);

    expect(order).toEqual([
      'onSelect',
      'onChange',
      'onSelectMultiple',
      'onChange',
      'onSelectMultiple',
      'onChange',
    ]);
  });

  it('fires selectAll event', () => {
    const order = [];
    const handleSelectAll = jest.fn().mockImplementation(() => {
      order.push('onSelectAll');
    });
    const handleChange = jest.fn().mockImplementation(() => {
      order.push('onChange');
    });
    const rowSelection = {
      onChange: handleChange,
      onSelectAll: handleSelectAll,
    };
    const wrapper = mount(createTable({ rowSelection }));

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { checked: true } });
    expect(handleSelectAll).toHaveBeenCalledWith(true, data, data);

    expect(order).toEqual(['onSelectAll', 'onChange']);

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { checked: false } });
    expect(handleSelectAll).toHaveBeenCalledWith(false, [], data);
  });

  it('works with selectAll option inside selection menu', () => {
    const handleChange = jest.fn();
    const rowSelection = {
      onChange: handleChange,
      selections: true,
    };
    const wrapper = mount(createTable({ rowSelection }));

    // Open
    wrapper.find('Trigger').setState({ popupVisible: true });

    const dropdownWrapper = mount(wrapper.find('Trigger').first().instance().getComponent());
    dropdownWrapper.find('.ant-dropdown-menu-item').first().simulate('click');
    expect(handleChange.mock.calls[0][0]).toEqual([0, 1, 2, 3]);
  });

  it('render with default selection correctly', () => {
    const rowSelection = {
      selections: true,
    };
    const wrapper = mount(createTable({ rowSelection }));
    const dropdownWrapper = mount(wrapper.find('Trigger').instance().getComponent());
    expect(dropdownWrapper.render()).toMatchSnapshot();
  });

  it('fires selectInvert event', () => {
    jest.useFakeTimers();

    const order = [];
    const handleSelectInvert = jest.fn().mockImplementation(() => {
      order.push('onSelectInvert');
    });
    const handleChange = jest.fn().mockImplementation(() => {
      order.push('onChange');
    });
    const rowSelection = {
      onChange: handleChange,
      onSelectInvert: handleSelectInvert,
      selections: true,
    };
    const wrapper = mount(createTable({ rowSelection }));
    const checkboxes = wrapper.find('input');

    checkboxes.at(1).simulate('change', { target: { checked: true } });

    // Open
    wrapper.find('span.ant-dropdown-trigger').simulate('mouseEnter');

    // enzyme has bug for state sync.
    // Let fresh multiple times to force sync back.
    for (let i = 0; i < 3; i += 1) {
      act(() => {
        jest.runAllTimers();
        wrapper.update();
      });
    }

    wrapper.find('li.ant-dropdown-menu-item').at(1).simulate('click');

    expect(handleSelectInvert).toHaveBeenCalledWith([1, 2, 3]);

    expect(order).toEqual(['onChange', 'onSelectInvert', 'onChange']);

    jest.useRealTimers();
  });

  it('fires selectNone event', () => {
    const order = [];
    const handleChange = jest.fn().mockImplementation(() => {
      order.push('onChange');
    });
    const handleSelectNone = jest.fn().mockImplementation(() => {
      order.push('onSelectNone');
    });
    const rowSelection = {
      onChange: handleChange,
      onSelectNone: handleSelectNone,
      selections: true,
    };
    const wrapper = mount(createTable({ rowSelection }));
    const checkboxes = wrapper.find('input');

    checkboxes.at(1).simulate('change', { target: { checked: true } });

    // Open
    wrapper.find('Trigger').setState({ popupVisible: true });

    const dropdownWrapper = mount(wrapper.find('Trigger').first().instance().getComponent());
    dropdownWrapper.find('.ant-dropdown-menu-item').last().simulate('click');

    expect(handleSelectNone).toHaveBeenCalled();
    expect(order).toEqual(['onChange', 'onSelectNone', 'onChange']);
  });

  it('fires selection event', () => {
    const handleSelectOdd = jest.fn();
    const handleSelectEven = jest.fn();
    const rowSelection = {
      selections: [
        Table.SELECTION_ALL,
        Table.SELECTION_INVERT,
        {
          key: 'odd',
          text: '奇数项',
          onSelect: handleSelectOdd,
        },
        {
          key: 'even',
          text: '偶数项',
          onSelect: handleSelectEven,
        },
      ],
    };
    const wrapper = mount(createTable({ rowSelection }));

    // Open
    wrapper.find('Trigger').setState({ popupVisible: true });

    const dropdownWrapper = mount(wrapper.find('Trigger').first().instance().getComponent());
    expect(dropdownWrapper.find('li.ant-dropdown-menu-item').length).toBe(4);

    dropdownWrapper.find('li.ant-dropdown-menu-item').at(2).simulate('click');
    expect(handleSelectOdd).toHaveBeenCalledWith([0, 1, 2, 3]);

    dropdownWrapper.find('li.ant-dropdown-menu-item').at(3).simulate('click');
    expect(handleSelectEven).toHaveBeenCalledWith([0, 1, 2, 3]);
  });

  describe('preset selection options', () => {
    const presetData = [
      { key: 0, name: 'Jack' },
      { key: 1, name: 'Lucy', disabled: true },
      { key: 2, name: 'Tom' },
    ];

    const getCheckboxProps = record => record;

    it('SELECTION_ALL', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        createTable({
          dataSource: presetData,
          rowSelection: {
            onChange,
            defaultSelectedRowKeys: [2],
            getCheckboxProps,
            selections: [Table.SELECTION_ALL],
          },
        }),
      );

      wrapper.find('Trigger').setState({ popupVisible: true });
      wrapper.find('li.ant-dropdown-menu-item').first().simulate('click');

      expect(onChange).toHaveBeenCalledWith([0, 2], expect.anything());
    });

    it('SELECTION_INVERT', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        createTable({
          dataSource: presetData,
          rowSelection: {
            onChange,
            defaultSelectedRowKeys: [2],
            getCheckboxProps,
            selections: [Table.SELECTION_INVERT],
          },
        }),
      );

      wrapper.find('Trigger').setState({ popupVisible: true });
      wrapper.find('li.ant-dropdown-menu-item').first().simulate('click');

      expect(onChange).toHaveBeenCalledWith([0], expect.anything());
    });

    it('SELECTION_NONE', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        createTable({
          dataSource: presetData,
          rowSelection: {
            onChange,
            defaultSelectedRowKeys: [1, 2],
            getCheckboxProps,
            selections: [Table.SELECTION_NONE],
          },
        }),
      );

      wrapper.find('Trigger').setState({ popupVisible: true });
      wrapper.find('li.ant-dropdown-menu-item').first().simulate('click');

      expect(onChange).toHaveBeenCalledWith([1], expect.anything());
    });
  });

  it('could hide selectAll checkbox and custom selection', () => {
    const rowSelection = {
      hideSelectAll: true,
    };
    const wrapper = mount(createTable({ rowSelection }));
    expect(wrapper.find('.ant-selection').exists()).toBeFalsy();
  });

  it('handle custom selection onSelect correctly when hide default selection options', () => {
    const handleSelectOdd = jest.fn();
    const handleSelectEven = jest.fn();
    const rowSelection = {
      selections: [
        {
          key: 'odd',
          text: '奇数项',
          onSelect: handleSelectOdd,
        },
        {
          key: 'even',
          text: '偶数项',
          onSelect: handleSelectEven,
        },
      ],
    };
    const wrapper = mount(createTable({ rowSelection }));

    // Open
    wrapper.find('Trigger').setState({ popupVisible: true });

    const dropdownWrapper = mount(wrapper.find('Trigger').first().instance().getComponent());
    expect(dropdownWrapper.find('li.ant-dropdown-menu-item').length).toBe(2);

    dropdownWrapper.find('li.ant-dropdown-menu-item').at(0).simulate('click');
    expect(handleSelectOdd).toHaveBeenCalledWith([0, 1, 2, 3]);

    dropdownWrapper.find('li.ant-dropdown-menu-item').at(1).simulate('click');
    expect(handleSelectEven).toHaveBeenCalledWith([0, 1, 2, 3]);
  });

  // https://github.com/ant-design/ant-design/issues/4245
  it('handles disabled checkbox correctly when dataSource changes', () => {
    const rowSelection = {
      getCheckboxProps: record => ({ disabled: record.disabled }),
    };
    const wrapper = mount(createTable({ rowSelection }));
    const newData = [
      { key: 0, name: 'Jack', disabled: true },
      { key: 1, name: 'Lucy', disabled: true },
    ];
    wrapper.setProps({ dataSource: newData });
    wrapper.find('input').forEach(checkbox => {
      expect(checkbox.props().disabled).toBe(true);
    });
  });

  // https://github.com/ant-design/ant-design/issues/4245
  it('should allow dynamic getCheckboxProps', () => {
    const { container, rerender } = render(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{
          getCheckboxProps: record => ({ disabled: record.name === 'Jack' }),
        }}
      />,
    );

    let checkboxList = container.querySelectorAll('input');
    expect(checkboxList[1]).toHaveAttribute('disabled');
    expect(checkboxList[2]).not.toHaveAttribute('disabled');

    rerender(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{
          getCheckboxProps: record => ({ disabled: record.name === 'Lucy' }),
        }}
      />,
    );
    checkboxList = container.querySelectorAll('input');
    expect(checkboxList[1]).not.toHaveAttribute('disabled');
    expect(checkboxList[2]).toHaveAttribute('disabled');
  });

  // https://github.com/ant-design/ant-design/issues/4779
  it('should not switch pagination when select record', () => {
    const newData = [];
    for (let i = 0; i < 20; i += 1) {
      newData.push({
        key: i.toString(),
        name: i.toString(),
      });
    }
    const wrapper = mount(
      createTable({
        rowSelection: {},
        dataSource: newData,
      }),
    );
    wrapper.find('Pager').last().simulate('click'); // switch to second page
    wrapper.update();
    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { checked: true } });
    wrapper.update();
    expect(renderedNames(wrapper)).toEqual([
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
    ]);
  });

  it('highlight selected row', () => {
    const wrapper = mount(createTable());
    wrapper
      .find('input')
      .at(1)
      .simulate('change', { target: { checked: true } });
    expect(wrapper.find('tbody tr').at(0).hasClass('ant-table-row-selected')).toBe(true);
  });

  it('fix selection column on the left', () => {
    const wrapper = mount(
      createTable({
        rowSelection: { fixed: true },
        scroll: { x: 903 },
      }),
    );

    expect(wrapper.render()).toMatchSnapshot();
  });

  it('fix expand on th left when selection column fixed on the left', () => {
    const wrapper = mount(
      createTable({
        expandable: {
          expandedRowRender() {
            return <div />;
          },
        },
        rowSelection: { fixed: true },
        scroll: { x: 903 },
      }),
    );

    expect(wrapper.render()).toMatchSnapshot();
  });

  it('fix selection column on the left when any other column is fixed', () => {
    const wrapper = mount(
      createTable({
        rowSelection: {},
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            fixed: 'left',
          },
        ],
        scroll: { x: 903 },
      }),
    );

    expect(wrapper.render()).toMatchSnapshot();
  });

  it('use column as selection column when key is `selection-column`', () => {
    const wrapper = mount(
      createTable({
        rowSelection: {},
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'selection-column',
          },
        ],
      }),
    );

    expect(wrapper.render()).toMatchSnapshot();
  });

  // https://github.com/ant-design/ant-design/issues/10629
  it('should keep all checked state when remove item from dataSource', () => {
    const wrapper = mount(
      <Table
        rowSelection={{
          selectedRowKeys: [0, 1, 2, 3],
        }}
        columns={columns}
        dataSource={data}
      />,
    );
    expect(wrapper.find(Checkbox).length).toBe(5);
    wrapper.find(Checkbox).forEach(checkbox => {
      expect(checkbox.props().checked).toBe(true);
      expect(checkbox.props().indeterminate).toBe(false);
    });
    wrapper.setProps({
      dataSource: data.slice(1),
      rowSelection: {
        selectedRowKeys: [1, 2, 3],
      },
    });
    expect(wrapper.find(Checkbox).length).toBe(4);
    wrapper.find(Checkbox).forEach(checkbox => {
      expect(checkbox.props().checked).toBe(true);
      expect(checkbox.props().indeterminate).toBe(false);
    });
  });

  // https://github.com/ant-design/ant-design/issues/11042
  it('add columnTitle for rowSelection', () => {
    const wrapper = mount(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{
          columnTitle: '多选',
        }}
      />,
    );
    expect(wrapper.find('thead tr th').at(0).text()).toBe('多选');
    wrapper.setProps({
      rowSelection: {
        type: 'radio',
        columnTitle: '单选',
      },
    });
    expect(wrapper.find('thead tr th').at(0).text()).toBe('单选');
  });

  // https://github.com/ant-design/ant-design/issues/11384
  it('should keep item even if in filter', () => {
    const filterColumns = [
      {
        title: 'Name',
        dataIndex: 'name',
        filters: [
          {
            text: 'Jack',
            value: 'Jack',
          },
          {
            text: 'Lucy',
            value: 'Lucy',
          },
        ],
        filterDropdownVisible: true,
        onFilter: (value, record) => record.name.indexOf(value) === 0,
      },
    ];

    const onChange = jest.fn();
    const rowSelection = {
      onChange,
    };

    const wrapper = mount(
      <Table columns={filterColumns} dataSource={data} rowSelection={rowSelection} />,
    );

    function clickFilter(indexList) {
      indexList.forEach(index => {
        wrapper.find('.ant-dropdown-menu-item .ant-checkbox-wrapper').at(index).simulate('click');
      });
      wrapper.find('.ant-table-filter-dropdown-btns .ant-btn-primary').simulate('click');
    }

    function clickItem() {
      wrapper
        .find('tbody .ant-table-selection-column .ant-checkbox-input')
        .at(0)
        .simulate('change', {
          target: { checked: true },
        });
    }

    // Check Jack
    clickFilter([0]);
    expect(wrapper.find('tbody tr').length).toBe(1);
    clickItem();
    expect(onChange.mock.calls[0][0].length).toBe(1);
    expect(onChange.mock.calls[0][1].length).toBe(1);

    // Check Lucy
    clickFilter([0, 1]);
    expect(wrapper.find('tbody tr').length).toBe(1);
    clickItem();
    expect(onChange.mock.calls[1][0].length).toBe(2);
    expect(onChange.mock.calls[1][1].length).toBe(2);
  });

  it('render correctly when set childrenColumnName', () => {
    const newDatas = [
      {
        key: 1,
        name: 'Jack',
        children: [
          {
            key: 11,
            name: 'John Brown',
          },
        ],
      },
      {
        key: 2,
        name: 'Lucy',
        children: [
          {
            key: 21,
            name: 'Lucy Brown',
          },
        ],
      },
    ];
    const wrapper = mount(
      <Table columns={columns} dataSource={newDatas} childrenColumnName="test" rowSelection={{}} />,
    );
    const checkboxes = wrapper.find('input');

    checkboxes.at(1).simulate('change', { target: { checked: true } });
    expect(wrapper.find('Checkbox').first().props()).toEqual(
      expect.objectContaining({ indeterminate: true, checked: false }),
    );

    checkboxes.at(2).simulate('change', { target: { checked: true } });
    expect(wrapper.find('Checkbox').first().props()).toEqual(
      expect.objectContaining({ indeterminate: false, checked: true }),
    );
  });

  // https://github.com/ant-design/ant-design/issues/16614
  it('should get selectedRows correctly when set childrenColumnName', () => {
    const onChange = jest.fn();
    const newDatas = [
      {
        key: 1,
        name: 'Jack',
        list: [
          {
            key: 11,
            name: 'John Brown',
          },
        ],
      },
    ];
    const wrapper = mount(
      <Table
        columns={columns}
        dataSource={newDatas}
        childrenColumnName="list"
        rowSelection={{ onChange }}
        expandedRowKeys={[1]}
      />,
    );
    const checkboxes = wrapper.find('input');
    checkboxes.at(2).simulate('change', { target: { checked: true } });
    expect(onChange).toHaveBeenLastCalledWith([11], [newDatas[0].list[0]]);
    onChange.mockReset();

    checkboxes.at(1).simulate('change', { target: { checked: true } });
    const item0 = newDatas[0];
    expect(onChange).toHaveBeenLastCalledWith([11, 1], [newDatas[0].list[0], item0]);
  });

  it('clear selection className when remove `rowSelection`', () => {
    const dataSource = [
      { id: 1, name: 'Hello', age: 10 },
      { id: 2, name: 'World', age: 30 },
    ];

    const wrapper = mount(
      <Table
        columns={columns}
        dataSource={dataSource}
        rowSelection={{}}
        expandedRowRender={() => null}
        rowKey="id"
      />,
    );
    const checkboxes = wrapper.find('input');
    checkboxes.at(1).simulate('change', { target: { checked: true } });

    expect(wrapper.find('tr.ant-table-row-selected').length).toBe(1);

    wrapper.setProps({ rowSelection: null });
    wrapper.update();
    expect(wrapper.find('tr.ant-table-row-selected').length).toBe(0);
  });

  it('select by checkbox to trigger stopPropagation', () => {
    const wrapper = mount(createTable());
    expect(() => {
      wrapper.find('span').at(10).simulate('click');
    }).not.toThrow();
  });

  it('all disabled should not make select all checked', () => {
    const wrapper = mount(
      createTable({
        rowSelection: {
          getCheckboxProps: () => ({
            disabled: true,
          }),
        },
      }),
    );

    expect(wrapper.find('thead .ant-checkbox-input').props().disabled).toBeTruthy();
    expect(wrapper.find('thead .ant-checkbox-input').props().checked).toBeFalsy();
  });

  it('should make select all checked when each item is checked and disabled', () => {
    const wrapper = mount(
      createTable({
        rowSelection: {
          selectedRowKeys: [0, 1, 2, 3],
          getCheckboxProps: () => ({
            disabled: true,
          }),
        },
      }),
    );

    expect(wrapper.find('thead .ant-checkbox-input').props().disabled).toBeTruthy();
    expect(wrapper.find('thead .ant-checkbox-input').props().checked).toBeTruthy();
  });

  it('should make select all indeterminated when each item is disabled and some item is checked', () => {
    const wrapper = mount(
      createTable({
        rowSelection: {
          selectedRowKeys: [0],
          getCheckboxProps: () => ({
            disabled: true,
          }),
        },
      }),
    );

    expect(wrapper.find('thead .ant-checkbox-input').props().disabled).toBeTruthy();
    expect(wrapper.find('thead .ant-checkbox-input').props().checked).toBeFalsy();
    expect(
      wrapper.find('thead .ant-checkbox-indeterminate.ant-checkbox-disabled').exists(),
    ).toBeTruthy();
  });

  it('should make select all checked when each item is checked and some item is disabled', () => {
    const wrapper = mount(
      createTable({
        rowSelection: {
          selectedRowKeys: [0, 1, 2, 3],
          getCheckboxProps: record => ({
            disabled: record.key === 0,
          }),
        },
      }),
    );

    expect(wrapper.find('thead .ant-checkbox-input').props().disabled).toBeFalsy();
    expect(wrapper.find('thead .ant-checkbox-input').props().checked).toBeTruthy();
  });

  it('should not make select all checked when some item is checked and disabled', () => {
    const wrapper = mount(
      createTable({
        rowSelection: {
          selectedRowKeys: [1],
          getCheckboxProps: record => ({
            disabled: record.key === 0,
          }),
        },
      }),
    );

    expect(wrapper.find('thead .ant-checkbox-input').props().disabled).toBeFalsy();
    expect(wrapper.find('thead .ant-checkbox-input').props().checked).toBeFalsy();
    expect(wrapper.find('thead .ant-checkbox-indeterminate').exists()).toBeTruthy();
  });

  it('should onRowClick not called when checkbox clicked', () => {
    const onRowClick = jest.fn();

    const wrapper = mount(
      createTable({
        onRow: () => ({
          onClick: onRowClick,
        }),
      }),
    );

    wrapper.find('input').last().simulate('click');

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('should support getPopupContainer', () => {
    const rowSelection = {
      selections: true,
    };
    const getPopupContainer = jest.fn(node => node);
    const wrapper = mount(
      createTable({
        rowSelection,
        getPopupContainer,
      }),
    );
    jest.useFakeTimers();
    wrapper.find('.ant-dropdown-trigger').simulate('mouseenter');
    jest.runAllTimers();
    expect(wrapper.render()).toMatchSnapshot();
    expect(getPopupContainer).toHaveBeenCalled();
  });

  it('should support getPopupContainer from ConfigProvider', () => {
    const rowSelection = {
      selections: true,
    };
    const wrapper = mount(
      <ConfigProvider getPopupContainer={node => node.parentNode}>
        {createTable({
          rowSelection,
        })}
      </ConfigProvider>,
    );
    jest.useFakeTimers();
    wrapper.find('.ant-dropdown-trigger').simulate('mouseenter');
    jest.runAllTimers();
    expect(wrapper.render()).toMatchSnapshot();
  });

  it('Table selection should check', () => {
    const onChange = jest.fn();
    const wrapper = mount(
      <Table
        dataSource={[{ name: 'light', sub: [{ name: 'bamboo' }] }]}
        expandable={{ expandedRowKeys: ['light'], childrenColumnName: 'sub' }}
        rowSelection={{ onChange }}
        rowKey="name"
      />,
    );

    wrapper
      .find('input')
      .last()
      .simulate('change', { target: { checked: true } });
    expect(onChange.mock.calls[0][1]).toEqual([expect.objectContaining({ name: 'bamboo' })]);
  });

  describe('supports children', () => {
    const dataWithChildren = [
      { key: 0, name: 'Jack' },
      { key: 1, name: 'Lucy' },
      { key: 2, name: 'Tom' },
      {
        key: 3,
        name: 'Jerry',
        children: [
          {
            key: 4,
            name: 'Jerry Jack',
          },
          {
            key: 5,
            name: 'Jerry Lucy',
          },
          {
            key: 6,
            name: 'Jerry Tom',
            children: [
              {
                key: 7,
                name: 'Jerry Tom Jack',
              },
              {
                key: 8,
                name: 'Jerry Tom Lucy',
              },
              {
                key: 9,
                name: 'Jerry Tom Tom',
              },
            ],
          },
        ],
      },
    ];
    describe('supports checkStrictly', () => {
      it('use data entity key', () => {
        const onChange = jest.fn();

        const table = createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
        });
        const wrapper = mount(table);
        const checkboxes = wrapper.find('input');

        checkboxes.at(4).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper)).toEqual([3, 4, 5, 6, 7, 8, 9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(onChange.mock.calls[0][0]).toEqual([3, 4, 5, 6, 7, 8, 9]);
        checkboxes.at(7).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper)).toEqual([4, 5]);
        expect(getIndeterminateSelection(wrapper)).toEqual([3]);
        expect(onChange.mock.calls[1][0]).toEqual([4, 5]);
      });
      it('use function rowkey', () => {
        const onChange = jest.fn();
        const table = createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
          rowKey: entity => entity.name,
        });
        const wrapper = mount(table);
        const checkboxes = wrapper.find('input');

        checkboxes.at(4).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper)).toEqual([3, 4, 5, 6, 7, 8, 9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(onChange.mock.calls[0][0]).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom',
          'Jerry Tom Jack',
          'Jerry Tom Lucy',
          'Jerry Tom Tom',
        ]);
        checkboxes.at(7).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper)).toEqual([4, 5]);
        expect(getIndeterminateSelection(wrapper)).toEqual([3]);
        expect(onChange.mock.calls[1][0]).toEqual(['Jerry Jack', 'Jerry Lucy']);
      });
      it('use string rowkey', () => {
        const onChange = jest.fn();
        const table = createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
          rowKey: 'name',
        });
        const wrapper = mount(table);
        const checkboxes = wrapper.find('input');

        checkboxes.at(4).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper)).toEqual([3, 4, 5, 6, 7, 8, 9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(onChange.mock.calls[0][0]).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom',
          'Jerry Tom Jack',
          'Jerry Tom Lucy',
          'Jerry Tom Tom',
        ]);
        checkboxes.at(7).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper)).toEqual([4, 5]);
        expect(getIndeterminateSelection(wrapper)).toEqual([3]);
        expect(onChange.mock.calls[1][0]).toEqual(['Jerry Jack', 'Jerry Lucy']);
      });
      it('initialized correctly', () => {
        const table = createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            selectedRowKeys: [7, 8, 9],
          },
          rowKey: 'key',
        });
        const wrapper = mount(table);
        expect(getSelections(wrapper)).toEqual([6, 7, 8, 9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([3]);
      });
      it('works with disabled checkbox', () => {
        const onChange = jest.fn();

        const table = createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            onChange,
            getCheckboxProps(record) {
              return {
                disabled: record.name === 'Jerry Tom',
              };
            },
          },
        });
        const wrapper = mount(table);
        const checkboxes = wrapper.find('input');

        checkboxes.at(10).simulate('change', { target: { checked: true } });
        checkboxes.at(4).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper).sort()).toEqual([3, 4, 5, 9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(Array.from(onChange.mock.calls[1][0]).sort()).toEqual([3, 4, 5, 9]);
        checkboxes.at(4).simulate('change', { target: { checked: false } });
        expect(getSelections(wrapper)).toEqual([9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(onChange.mock.calls[2][0]).toEqual([9]);
      });
      it('works with disabled checkbox and function rowkey', () => {
        const onChange = jest.fn();

        const table = createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            onChange,
            getCheckboxProps(record) {
              return {
                disabled: record.name === 'Jerry Tom',
              };
            },
          },
          rowKey: entity => entity.name,
        });
        const wrapper = mount(table);
        const checkboxes = wrapper.find('input');

        checkboxes.at(10).simulate('change', { target: { checked: true } });
        checkboxes.at(4).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper).sort()).toEqual([3, 4, 5, 9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(Array.from(onChange.mock.calls[1][0]).sort()).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom Tom',
        ]);
        checkboxes.at(4).simulate('change', { target: { checked: false } });
        expect(getSelections(wrapper)).toEqual([9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(onChange.mock.calls[2][0]).toEqual(['Jerry Tom Tom']);
      });
      it('works with disabled checkbox and string rowkey', () => {
        const onChange = jest.fn();

        const table = createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            onChange,
            getCheckboxProps(record) {
              return {
                disabled: record.name === 'Jerry Tom',
              };
            },
          },
          rowKey: 'name',
        });
        const wrapper = mount(table);
        const checkboxes = wrapper.find('input');

        checkboxes.at(10).simulate('change', { target: { checked: true } });
        checkboxes.at(4).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper).sort()).toEqual([3, 4, 5, 9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(Array.from(onChange.mock.calls[1][0]).sort()).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom Tom',
        ]);
        checkboxes.at(4).simulate('change', { target: { checked: false } });
        expect(getSelections(wrapper)).toEqual([9]);
        expect(getIndeterminateSelection(wrapper)).toEqual([]);
        expect(onChange.mock.calls[2][0]).toEqual(['Jerry Tom Tom']);
      });

      it('should support `childrenColumnName`', () => {
        const onChange = jest.fn();

        const table = createTable({
          dataSource: [
            {
              key: 0,
              name: 'Jack',
              childList: [
                { key: 1, name: 'Light' },
                { key: 2, name: 'Bamboo' },
              ],
            },
          ],
          expandable: {
            childrenColumnName: 'childList',
            defaultExpandAllRows: true,
          },
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
        });
        const wrapper = mount(table);
        const checkboxes = wrapper.find('input');
        expect(checkboxes).toHaveLength(1 + 3);

        checkboxes.at(1).simulate('change', { target: { checked: true } });
        expect(getSelections(wrapper)).toEqual([0, 1, 2]);
      });
    });
    it('warns when set `indeterminate` using `rowSelection.getCheckboxProps` is not allowed with tree structured data.', () => {
      resetWarned();
      mount(
        createTable({
          dataSource: dataWithChildren,
          defaultExpandAllRows: true,
          rowSelection: {
            checkStrictly: false,
            getCheckboxProps() {
              return {
                indeterminate: true,
              };
            },
          },
        }),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Warning: [antd: Table] set `indeterminate` using `rowSelection.getCheckboxProps` is not allowed with tree structured dataSource.',
      );
    });
  });

  describe('cache with selected keys', () => {
    it('default not cache', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        <Table
          dataSource={[{ name: 'light' }, { name: 'bamboo' }]}
          rowSelection={{ onChange }}
          rowKey="name"
        />,
      );

      wrapper
        .find('tbody input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(onChange).toHaveBeenCalledWith(['light'], [{ name: 'light' }]);

      wrapper.setProps({ dataSource: [{ name: 'bamboo' }] });
      wrapper
        .find('tbody input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(onChange).toHaveBeenCalledWith(['bamboo'], [{ name: 'bamboo' }]);
    });

    it('cache with preserveSelectedRowKeys', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        <Table
          dataSource={[{ name: 'light' }, { name: 'bamboo' }]}
          rowSelection={{ onChange, preserveSelectedRowKeys: true }}
          rowKey="name"
        />,
      );

      wrapper
        .find('tbody input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(onChange).toHaveBeenCalledWith(['light'], [{ name: 'light' }]);

      wrapper.setProps({ dataSource: [{ name: 'bamboo' }] });
      wrapper
        .find('tbody input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(onChange).toHaveBeenCalledWith(
        ['light', 'bamboo'],
        [{ name: 'light' }, { name: 'bamboo' }],
      );
    });

    it('works with receive selectedRowKeys fron [] to undefined', () => {
      const onChange = jest.fn();
      const dataSource = [{ name: 'Jack' }];
      const wrapper = mount(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: [0] }}
          rowKey="name"
        />,
      );

      wrapper.setProps({ rowSelection: { onChange, selectedRowKeys: undefined } });
      wrapper
        .find('tbody input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(onChange).toHaveBeenCalledWith(['Jack'], [{ name: 'Jack' }]);
    });

    it('works with selectionType radio receive selectedRowKeys from [] to undefined', () => {
      const onChange = jest.fn();
      const dataSource = [{ name: 'Jack' }];
      const wrapper = mount(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: [0], type: 'radio' }}
          rowKey="name"
        />,
      );

      wrapper.setProps({ rowSelection: { onChange, selectedRowKeys: undefined, type: 'radio' } });
      wrapper
        .find('tbody input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(onChange).toHaveBeenCalledWith(['Jack'], [{ name: 'Jack' }]);
    });

    it('selectedRows ant selectedKeys should keep sync in initial state', () => {
      const dataSource = [{ name: 'Jack' }, { name: 'Tom' }, { name: 'Lucy' }, { name: 'John' }];
      const onChange = jest.fn();
      const rowSelection = {
        preserveSelectedRowKeys: true,
        onChange,
        selectedRowKeys: ['Jack'],
      };
      const wrapper = mount(
        <Table
          dataSource={dataSource.slice(0, 2)}
          rowSelection={rowSelection}
          rowKey="name"
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              key: 'name',
            },
          ]}
        />,
      );

      wrapper.setProps({
        dataSource: dataSource.slice(2, 4),
      });
      wrapper
        .find('tbody input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(onChange).toHaveBeenCalledWith(['Jack', 'Lucy'], [{ name: 'Jack' }, { name: 'Lucy' }]);
    });
  });
});
