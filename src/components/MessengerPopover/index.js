import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { Button, Popover, List, Badge, Avatar, Icon, Empty } from 'antd';
import { Scrollbars } from 'react-custom-scrollbars';
import Spin from 'elements/Spin/Primary';
import MessengerPopoverIcon from 'elements/Icon/Messenger';
import styles from './index.module.less';

class MessengerPopover extends React.PureComponent {
    handleVisibleChange = () => {

    }

    handleScroll = () => {

    }

    getContent = () => {
        const {
            //messages,
            loading,
            oldLoading
        } = this.props;
        const messages = {};
        const content = _.isEmpty(messages) ? (
            <div className={styles.empty}>
                <div className={styles.inlineDiv}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No conversation"/>
                </div>
            </div>
        ) : (
            <Scrollbars style={{ height: 500 }} onScroll={this.handleScroll}>
                <List
                    className={styles.itemList}
                    dataSource={messages}
                    renderItem={item => (
                        <List.Item>

                        </List.Item>
                    )}
                />
                <div className={styles.oldLoading}>{oldLoading && (<></>)}</div>
            </Scrollbars>
        );
        return (
            <Spin
                spinning={loading}
                delay={0}
                fontSize={24}
            >
                <div>{content}</div>
                <div className={styles.viewAll}>View all</div>
            </Spin>
        );
    }

    render() {
        const { unread = 10 } = this.props;
        let count = 0;
        if (unread > 0)
            count = <Avatar style={{ background: 'red', fontSize: '11px' }} size={18}>{unread > 9 ? '9+' : unread}</Avatar>;
        const trigger = (
            <span className={styles.trigger}>
                <Badge
                    count={count}
                    style={{ boxShadow: 'none' }}
                    className={styles.badge}
                    overflowCount={9}
                >
                    <Icon type="message" style={{ fontSize: 18 }}/>
                </Badge>
            </span>
        );
        const content = this.getContent();
        if (!content)
            return trigger;
        return (
            <Popover
                placement="bottomRight"
                content={content}
                popupClassName={styles.popover}
                trigger="click"
                arrowPointAtCenter
                popupAlign={{ offset: [20, 0] }}
                onVisibleChange={this.handleVisibleChange}
            >
                {trigger}
            </Popover>
        )
    }
}

export default MessengerPopover;